"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import Badge from '@/components/Badge';
import { 
  Shield, RefreshCw, Filter
} from 'lucide-react';

interface AuditEntry {
  timestamp: string;
  action: string;
  target: string;
  details: string;
  user: string;
}

const ACTION_COLORS: Record<string, 'info' | 'success' | 'warning' | 'error' | 'default'> = {
  config_updated: 'warning',
  cron_action: 'info',
  auth_login: 'success',
  auth_failed: 'error',
};

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [allActions, setAllActions] = useState<string[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchEntries = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (actionFilter) params.set('action', actionFilter);
      const res = await fetch(`/api/audit?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);

        const actions = new Set<string>((data.entries || []).map((e: AuditEntry) => e.action));
        setAllActions(Array.from(actions).sort());
      }
    } catch {}
    setLoading(false);
  }, [actionFilter]);

  useEffect(() => {
    fetchEntries();
    intervalRef.current = setInterval(fetchEntries, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchEntries]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    } catch { return dateStr; }
  };

  const getVariant = (action: string) => ACTION_COLORS[action] || 'default';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-zinc-100 text-zinc-900">Audit Log</h1>
          <p className="text-sm text-zinc-500 mt-1">Activity trail for config changes, cron actions, and more</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="info">30s refresh</Badge>
          <button
            onClick={fetchEntries}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors dark:bg-zinc-800 bg-zinc-100 dark:hover:bg-zinc-700 hover:bg-zinc-200 dark:text-zinc-600 dark:text-zinc-500 text-zinc-600 border dark:border-zinc-700 border-zinc-300"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl dark:bg-zinc-900/80 bg-zinc-50/80 border dark:border-zinc-800/50 border-zinc-200/50 dark:text-zinc-600 text-zinc-500 text-sm focus:border-indigo-500/50 transition-colors appearance-none"
          >
            <option value="">All actions</option>
            {allActions.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64"><p className="text-zinc-500">Loading audit log...</p></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b dark:border-zinc-800/50 border-zinc-200/50">
                    <th className="px-4 py-3 text-left text-xs font-medium dark:text-zinc-500 text-zinc-600 uppercase tracking-wider">Timestamp</th>
                    <th className="px-4 py-3 text-left text-xs font-medium dark:text-zinc-500 text-zinc-600 uppercase tracking-wider">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-medium dark:text-zinc-500 text-zinc-600 uppercase tracking-wider">Target</th>
                    <th className="px-4 py-3 text-left text-xs font-medium dark:text-zinc-500 text-zinc-600 uppercase tracking-wider">Details</th>
                    <th className="px-4 py-3 text-left text-xs font-medium dark:text-zinc-500 text-zinc-600 uppercase tracking-wider">User</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-zinc-800/30 divide-zinc-200">
                  {entries.map((entry, i) => (
                    <tr key={i} className="dark:hover:bg-zinc-800/30 hover:bg-zinc-100 transition-colors">
                      <td className="px-4 py-3 text-sm text-zinc-500 whitespace-nowrap">{formatDate(entry.timestamp)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={getVariant(entry.action)}>{entry.action}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-500 font-mono max-w-[200px] truncate">{entry.target || '\u2014'}</td>
                      <td className="px-4 py-3 text-sm dark:text-zinc-400 text-zinc-500 max-w-[300px] truncate">{entry.details || '\u2014'}</td>
                      <td className="px-4 py-3 text-sm text-zinc-500">{entry.user || '\u2014'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {entries.length === 0 && (
              <div className="p-8 text-center text-zinc-500 text-sm">No audit entries found</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

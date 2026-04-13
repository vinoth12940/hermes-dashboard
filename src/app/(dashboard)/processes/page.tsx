"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import Badge from '@/components/Badge';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Activity, RefreshCw, XCircle, Timer, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-zinc-800/50 ${className}`} />;
}

function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="glass-card p-6 text-center space-y-3">
      <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
      <p className="text-sm text-zinc-400">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-xl text-sm font-medium dark:text-zinc-400 text-zinc-500 dark:hover:text-zinc-200 hover:text-zinc-800 dark:hover:bg-zinc-800/50 hover:bg-zinc-200/50 border dark:border-zinc-800/50 border-zinc-200/50 transition-colors inline-flex items-center gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        Retry
      </button>
    </div>
  );
}

interface Process {
  user: string;
  pid: number;
  cpu: number;
  mem: number;
  vsz: number;
  rss: number;
  stat: string;
  start: string;
  time: string;
  command: string;
}

export default function ProcessesPage() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [confirmKill, setConfirmKill] = useState<Process | null>(null);
  const [killing, setKilling] = useState(false);
  const [killMsg, setKillMsg] = useState('');
  const [sortKey, setSortKey] = useState<'cpu' | 'mem' | 'pid'>('cpu');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const fetchProcesses = useCallback(async () => {
    try {
      const res = await fetch('/api/processes');
      if (res.ok) {
        const data = await res.json();
        setProcesses(data.processes || []);
      } else {
        setError('Failed to load processes');
      }
    } catch {
      setError('Failed to load processes');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProcesses();
  }, [fetchProcesses]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchProcesses, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchProcesses]);

  const killProcess = async (pid: number) => {
    setKilling(true);
    try {
      const res = await fetch('/api/processes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'kill', pid }),
      });
      if (res.ok) {
        setKillMsg(`Process ${pid} killed`);
        setTimeout(() => setKillMsg(''), 3000);
        fetchProcesses();
      } else {
        const data = await res.json();
        setKillMsg(`Error: ${data.error}`);
      }
    } catch {
      setKillMsg('Failed to kill process');
    }
    setKilling(false);
    setConfirmKill(null);
  };

  const statusColor = (stat: string) => {
    if (stat.includes('R')) return 'success';
    if (stat.includes('S')) return 'success';
    if (stat.includes('T')) return 'warning';
    if (stat.includes('Z')) return 'error';
    return 'default';
  };

  const formatBytes = (kb: number) => {
    if (kb < 1024) return `${kb}K`;
    if (kb < 1024 * 1024) return `${(kb / 1024).toFixed(1)}M`;
    return `${(kb / (1024 * 1024)).toFixed(1)}G`;
  };

  const truncateCmd = (cmd: string) => {
    if (cmd.length > 80) return cmd.slice(0, 80) + '...';
    return cmd;
  };

  const toggleSort = (key: 'cpu' | 'mem' | 'pid') => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ col }: { col: 'cpu' | 'mem' | 'pid' }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 inline ml-1 opacity-40" />;
    return sortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 inline ml-1" />
      : <ArrowDown className="w-3 h-3 inline ml-1" />;
  };

  const sortedProcesses = useMemo(() => {
    return [...processes].sort((a, b) => {
      const mult = sortDir === 'asc' ? 1 : -1;
      return (a[sortKey] - b[sortKey]) * mult;
    });
  }, [processes, sortKey, sortDir]);

  const totalCpu = processes.reduce((s, p) => s + p.cpu, 0);
  const totalMem = processes.reduce((s, p) => s + p.mem, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-zinc-100 text-zinc-900 flex items-center gap-3">
            <Activity className="w-7 h-7 text-indigo-400" />
            Processes
          </h1>
          <p className="text-sm text-zinc-500 mt-1">{processes.length} Hermes-related processes</p>
        </div>
        <div className="flex items-center gap-3">
          {killMsg && (
            <Badge variant={killMsg.includes('Error') ? 'error' : 'success'}>{killMsg}</Badge>
          )}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors flex items-center gap-2 ${
              autoRefresh
                ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10'
                : 'dark:text-zinc-500 text-zinc-600 dark:border-zinc-800/50 border-zinc-200/50 dark:hover:text-zinc-300 hover:text-zinc-700 hover:text-zinc-700 dark:hover:bg-zinc-800/50 hover:bg-zinc-200/50'
            }`}
          >
            <Timer className={`w-4 h-4 ${autoRefresh ? 'animate-pulse' : ''}`} />
            {autoRefresh ? 'Live' : 'Paused'}
          </button>
          <button
            onClick={fetchProcesses}
            className="px-4 py-2 rounded-xl text-sm font-medium dark:text-zinc-500 text-zinc-600 dark:hover:text-zinc-200 hover:text-zinc-800 hover:text-zinc-800 dark:hover:bg-zinc-800/50 hover:bg-zinc-200/50 border dark:border-zinc-800/50 border-zinc-200/50 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {!loading && !error && processes.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="glass-card p-4">
            <p className="text-xs text-zinc-500 mb-1">Total Processes</p>
            <p className="text-xl font-bold dark:text-zinc-100 text-zinc-900">{processes.length}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-zinc-500 mb-1">Total CPU%</p>
            <p className={`text-xl font-bold ${totalCpu > 100 ? 'text-red-400' : totalCpu > 50 ? 'text-amber-400' : 'text-emerald-400'}`}>{totalCpu.toFixed(1)}%</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-zinc-500 mb-1">Total MEM%</p>
            <p className={`text-xl font-bold ${totalMem > 80 ? 'text-red-400' : totalMem > 50 ? 'text-amber-400' : 'text-emerald-400'}`}>{totalMem.toFixed(1)}%</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="glass-card overflow-hidden p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 items-center">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorBlock message={error} onRetry={fetchProcesses} />
      ) : processes.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Activity className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-500 text-sm">No Hermes processes found</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-zinc-800/50 border-zinc-200/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider cursor-pointer select-none hover:text-zinc-300 transition-colors" onClick={() => toggleSort('pid')}>PID <SortIcon col="pid" /></th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider cursor-pointer select-none hover:text-zinc-300 transition-colors" onClick={() => toggleSort('cpu')}>CPU% <SortIcon col="cpu" /></th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider cursor-pointer select-none hover:text-zinc-300 transition-colors" onClick={() => toggleSort('mem')}>MEM% <SortIcon col="mem" /></th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">MEM</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Stat</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Time</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Command</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/30">
                {sortedProcesses.map(p => (
                  <tr key={p.pid} className="dark:hover:bg-zinc-800/20 hover:bg-zinc-100 transition-colors group">
                    <td className="px-4 py-3 font-mono text-indigo-300">{p.pid}</td>
                    <td className="px-4 py-3 dark:text-zinc-400 text-zinc-500">{p.user}</td>
                    <td className={`px-4 py-3 font-mono ${p.cpu > 50 ? 'text-red-400' : p.cpu > 20 ? 'text-amber-400' : 'dark:text-zinc-400 text-zinc-500'}`}>
                      {p.cpu.toFixed(1)}
                    </td>
                    <td className={`px-4 py-3 font-mono ${p.mem > 50 ? 'text-red-400' : p.mem > 20 ? 'text-amber-400' : 'dark:text-zinc-400 text-zinc-500'}`}>
                      {p.mem.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 font-mono text-zinc-500">{formatBytes(p.rss)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusColor(p.stat)} size="sm">{p.stat}</Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-zinc-500">{p.time}</td>
                    <td className="px-4 py-3 font-mono dark:text-zinc-400 text-zinc-500 text-xs max-w-[300px] truncate" title={p.command}>
                      {truncateCmd(p.command)}
                    </td>
                    <td className="px-4 py-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setConfirmKill(p)}
                        className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="block md:hidden divide-y divide-zinc-800/30">
            {sortedProcesses.map(p => (
              <div key={p.pid} className="p-4 dark:hover:bg-zinc-800/20 hover:bg-zinc-100 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-mono text-indigo-300">PID {p.pid}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusColor(p.stat)} size="sm">{p.stat}</Badge>
                    <button
                      onClick={() => setConfirmKill(p)}
                      className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-xs font-mono dark:text-zinc-400 text-zinc-500 truncate mb-2" title={p.command}>
                  {truncateCmd(p.command)}
                </p>
                <div className="flex items-center gap-3 text-xs">
                  <span className={`font-mono ${p.cpu > 50 ? 'text-red-400' : p.cpu > 20 ? 'text-amber-400' : 'dark:text-zinc-400 text-zinc-500'}`}>
                    CPU {p.cpu.toFixed(1)}%
                  </span>
                  <span className={`font-mono ${p.mem > 50 ? 'text-red-400' : p.mem > 20 ? 'text-amber-400' : 'dark:text-zinc-400 text-zinc-500'}`}>
                    MEM {p.mem.toFixed(1)}%
                  </span>
                  <span className="font-mono dark:text-zinc-500 text-zinc-600">{formatBytes(p.rss)}</span>
                  <span className="font-mono dark:text-zinc-500 text-zinc-600">{p.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmKill}
        title="Kill Process"
        message={`Kill process ${confirmKill?.pid}? This will terminate: ${confirmKill?.command.slice(0, 100)}...`}
        confirmText={killing ? 'Killing...' : 'Kill'}
        variant="danger"
        onConfirm={() => confirmKill && killProcess(confirmKill.pid)}
        onCancel={() => setConfirmKill(null)}
      />
    </div>
  );
}

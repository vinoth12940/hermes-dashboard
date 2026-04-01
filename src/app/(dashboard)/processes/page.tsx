"use client";

import { useState, useEffect, useCallback } from 'react';
import Badge from '@/components/Badge';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Activity, RefreshCw, XCircle, Timer } from 'lucide-react';

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
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [confirmKill, setConfirmKill] = useState<Process | null>(null);
  const [killing, setKilling] = useState(false);
  const [killMsg, setKillMsg] = useState('');

  const fetchProcesses = useCallback(async () => {
    try {
      const res = await fetch('/api/processes');
      if (res.ok) {
        const data = await res.json();
        setProcesses(data.processes || []);
      }
    } catch {}
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-3">
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
                : 'text-zinc-500 border-zinc-800/50 hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
          >
            <Timer className={`w-4 h-4 ${autoRefresh ? 'animate-pulse' : ''}`} />
            {autoRefresh ? 'Live' : 'Paused'}
          </button>
          <button
            onClick={fetchProcesses}
            className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border border-zinc-800/50 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-zinc-500">Loading processes...</p>
        </div>
      ) : processes.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Activity className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-500 text-sm">No Hermes processes found</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">PID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">CPU%</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">MEM%</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">MEM</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Stat</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Time</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Command</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/30">
                {processes.map(p => (
                  <tr key={p.pid} className="hover:bg-zinc-800/20 transition-colors group">
                    <td className="px-4 py-3 font-mono text-indigo-300">{p.pid}</td>
                    <td className="px-4 py-3 text-zinc-400">{p.user}</td>
                    <td className={`px-4 py-3 font-mono ${p.cpu > 50 ? 'text-red-400' : p.cpu > 20 ? 'text-amber-400' : 'text-zinc-400'}`}>
                      {p.cpu.toFixed(1)}
                    </td>
                    <td className={`px-4 py-3 font-mono ${p.mem > 50 ? 'text-red-400' : p.mem > 20 ? 'text-amber-400' : 'text-zinc-400'}`}>
                      {p.mem.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 font-mono text-zinc-500">{formatBytes(p.rss)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusColor(p.stat)} size="sm">{p.stat}</Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-zinc-500">{p.time}</td>
                    <td className="px-4 py-3 font-mono text-zinc-400 text-xs max-w-[300px] truncate" title={p.command}>
                      {truncateCmd(p.command)}
                    </td>
                    <td className="px-4 py-3 opacity-0 group-hover:opacity-100 transition-opacity">
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

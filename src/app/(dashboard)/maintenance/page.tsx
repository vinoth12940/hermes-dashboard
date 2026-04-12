"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  Server, HardDrive, Shield, RefreshCw, Trash2,
  Activity, Clock, AlertTriangle, CheckCircle, Wrench
} from 'lucide-react';

// --- Types ---
interface Service {
  name: string;
  status: 'active' | 'inactive' | 'unknown';
  uptime: string;
  memory: string;
}

interface SystemInfo {
  os: string;
  kernel: string;
  hostname: string;
  ip: string;
  cfTunnel: 'running' | 'stopped' | 'unknown';
  ufwRules: number;
  ufwPorts: string[];
}

interface DiskInfo {
  total: string;
  used: string;
  free: string;
  percent: number;
  largestDirs: Array<{ name: string; size: string; sizeBytes: number }>;
}

interface LogEntry {
  timestamp: string;
  level: 'OK' | 'WARN' | 'ERROR' | 'INFO' | 'UPDATE' | 'CLEANUP';
  message: string;
}

// --- Skeleton helpers ---
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-zinc-800/50 ${className}`} />;
}

function SkeletonCard() {
  return (
    <div className="glass-card p-5 space-y-3">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-32" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-8 w-16 rounded-lg" />
      </div>
    </div>
  );
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

// --- Main Page ---
export default function MaintenancePage() {
  // Services state
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState('');
  const [serviceAction, setServiceAction] = useState<{ name: string; action: string } | null>(null);

  // System info state
  const [sysInfo, setSysInfo] = useState<SystemInfo | null>(null);
  const [sysInfoLoading, setSysInfoLoading] = useState(true);
  const [sysInfoError, setSysInfoError] = useState('');

  // Disk state
  const [diskInfo, setDiskInfo] = useState<DiskInfo | null>(null);
  const [diskLoading, setDiskLoading] = useState(true);
  const [diskError, setDiskError] = useState('');
  const [diskAction, setDiskAction] = useState('');

  // Maintenance log state
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [logLoading, setLogLoading] = useState(true);
  const [logError, setLogError] = useState('');
  const [updateChecking, setUpdateChecking] = useState(false);

  // --- Fetchers ---
  const fetchServices = useCallback(async () => {
    try {
      setServicesError('');
      const res = await fetch('/api/services');
      if (res.ok) {
        const data = await res.json();
        setServices(data.services || []);
      } else if (res.status === 404) {
        setServicesError('Services API not available yet');
      } else {
        setServicesError('Failed to load services');
      }
    } catch {
      setServicesError('Network error loading services');
    }
    setServicesLoading(false);
  }, []);

  const fetchSystemInfo = useCallback(async () => {
    try {
      setSysInfoError('');
      const res = await fetch('/api/system/info');
      if (res.ok) {
        const data = await res.json();
        setSysInfo(data);
      } else if (res.status === 404) {
        setSysInfoError('System info API not available yet');
      } else {
        setSysInfoError('Failed to load system info');
      }
    } catch {
      setSysInfoError('Network error loading system info');
    }
    setSysInfoLoading(false);
  }, []);

  const fetchDiskInfo = useCallback(async () => {
    try {
      setDiskError('');
      const res = await fetch('/api/disk');
      if (res.ok) {
        const data = await res.json();
        setDiskInfo(data);
      } else if (res.status === 404) {
        setDiskError('Disk API not available yet');
      } else {
        setDiskError('Failed to load disk info');
      }
    } catch {
      setDiskError('Network error loading disk info');
    }
    setDiskLoading(false);
  }, []);

  const fetchMaintenanceLog = useCallback(async () => {
    try {
      setLogError('');
      const res = await fetch('/api/maintenance');
      if (res.ok) {
        const data = await res.json();
        setLogEntries(data.entries || []);
      } else if (res.status === 404) {
        setLogError('Maintenance log API not available yet');
      } else {
        setLogError('Failed to load maintenance log');
      }
    } catch {
      setLogError('Network error loading maintenance log');
    }
    setLogLoading(false);
  }, []);

  useEffect(() => {
    fetchServices();
    fetchSystemInfo();
    fetchDiskInfo();
    fetchMaintenanceLog();
  }, [fetchServices, fetchSystemInfo, fetchDiskInfo, fetchMaintenanceLog]);

  // --- Actions ---
  const handleServiceAction = async (name: string, action: string) => {
    setServiceAction({ name, action });
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: name, action }),
      });
      if (res.ok) {
        await fetchServices();
      }
    } catch {
      // silently fail, user can retry
    }
    setServiceAction(null);
  };

  const handleDiskAction = async (action: string) => {
    setDiskAction(action);
    try {
      const res = await fetch('/api/disk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        await fetchDiskInfo();
        await fetchMaintenanceLog();
      }
    } catch {
      // silently fail
    }
    setDiskAction('');
  };

  const handleCheckUpdates = async () => {
    setUpdateChecking(true);
    try {
      await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check_updates' }),
      });
      await fetchMaintenanceLog();
    } catch {
      // silently fail
    }
    setUpdateChecking(false);
  };

  // --- Render helpers ---
  const statusBadge = (status: string) => {
    const map: Record<string, { color: string; bg: string; border: string }> = {
      active: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
      running: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
      inactive: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
      stopped: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
      unknown: { color: 'text-zinc-500', bg: 'bg-zinc-500/10', border: 'border-zinc-500/20' },
    };
    const s = map[status] || map.unknown;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${s.color} ${s.bg} border ${s.border}`}>
        {status}
      </span>
    );
  };

  const actionBtn = (label: string, action: string, name: string, icon: React.ReactNode, variant: 'default' | 'danger' = 'default') => {
    const isLoading = serviceAction?.name === name && serviceAction?.action === action;
    const colors = variant === 'danger'
      ? 'dark:text-zinc-400 text-zinc-500 dark:hover:text-red-400 hover:text-red-600 dark:hover:bg-red-500/10 hover:bg-red-500/10 border dark:border-zinc-800/50 border-zinc-200/50'
      : 'dark:text-zinc-400 text-zinc-500 dark:hover:text-indigo-300 hover:text-indigo-600 dark:hover:bg-indigo-500/10 hover:bg-indigo-500/10 border dark:border-zinc-800/50 border-zinc-200/50';
    return (
      <button
        onClick={() => handleServiceAction(name, action)}
        disabled={isLoading}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1.5 disabled:opacity-50 ${colors}`}
      >
        {isLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : icon}
        {label}
      </button>
    );
  };

  const logLevelColor = (level: string) => {
    const map: Record<string, string> = {
      OK: 'text-emerald-400',
      WARN: 'text-amber-400',
      ERROR: 'text-red-400',
      INFO: 'text-zinc-500',
      UPDATE: 'text-blue-400',
      CLEANUP: 'text-orange-400',
    };
    return map[level] || 'text-zinc-500';
  };

  const logLevelBg = (level: string) => {
    const map: Record<string, string> = {
      OK: 'bg-emerald-500/10',
      WARN: 'bg-amber-500/10',
      ERROR: 'bg-red-500/10',
      INFO: 'bg-zinc-500/10',
      UPDATE: 'bg-blue-500/10',
      CLEANUP: 'bg-orange-500/10',
    };
    return map[level] || 'bg-zinc-500/10';
  };

  const diskBarColor = (pct: number) => {
    if (pct > 90) return 'bg-red-500';
    if (pct > 75) return 'bg-amber-500';
    return 'bg-indigo-500';
  };

  const maxDirSize = (diskInfo?.largestDirs?.length && diskInfo.largestDirs[0]?.sizeBytes) || 1;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold dark:text-zinc-100 text-zinc-900 flex items-center gap-3">
          <Wrench className="w-7 h-7 text-indigo-400" />
          Maintenance
        </h1>
        <p className="text-sm text-zinc-500 mt-1">Manage services, system info, disk usage, and maintenance logs</p>
      </div>

      {/* ─── SERVICES ─── */}
      <section>
        <h2 className="text-lg font-semibold dark:text-zinc-200 text-zinc-700 flex items-center gap-2 mb-4">
          <Server className="w-5 h-5 text-indigo-400" />
          Services
        </h2>
        {servicesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : servicesError ? (
          <ErrorBlock message={servicesError} onRetry={fetchServices} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(services.length > 0 ? services : [
              { name: 'hermes-gateway', status: 'unknown', uptime: '-', memory: '-' },
              { name: 'hermes-dashboard', status: 'unknown', uptime: '-', memory: '-' },
              { name: 'cloudflared-tunnel', status: 'unknown', uptime: '-', memory: '-' },
            ]).map((svc) => (
              <div key={svc.name} className="glass-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold dark:text-zinc-200 text-zinc-700 font-mono">{svc.name}</h3>
                  {statusBadge(svc.status)}
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 dark:text-zinc-400 text-zinc-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Uptime: {svc.uptime}</span>
                  </div>
                  <div className="flex items-center gap-2 dark:text-zinc-400 text-zinc-500">
                    <Activity className="w-3.5 h-3.5" />
                    <span>Memory: {svc.memory}</span>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  {actionBtn('Restart', 'restart', svc.name, <RefreshCw className="w-3 h-3" />)}
                  {svc.status === 'active' || svc.status === 'running'
                    ? actionBtn('Stop', 'stop', svc.name, <span className="w-2 h-2 rounded-full bg-red-500" />, 'danger')
                    : actionBtn('Start', 'start', svc.name, <span className="w-2 h-2 rounded-full bg-emerald-500" />)
                  }
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── SYSTEM INFO ─── */}
      <section>
        <h2 className="text-lg font-semibold dark:text-zinc-200 text-zinc-700 flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-indigo-400" />
          System Info
        </h2>
        {sysInfoLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : sysInfoError ? (
          <ErrorBlock message={sysInfoError} onRetry={fetchSystemInfo} />
        ) : sysInfo ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* OS & Kernel */}
            <div className="glass-card p-5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                <Server className="w-4 h-4 text-indigo-400" />
                OS &amp; Kernel
              </div>
              <p className="text-sm font-medium dark:text-zinc-200 text-zinc-700">{sysInfo.os}</p>
              <p className="text-xs dark:text-zinc-400 text-zinc-500 font-mono">{sysInfo.kernel}</p>
            </div>
            {/* Hostname & IP */}
            <div className="glass-card p-5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                <Activity className="w-4 h-4 text-indigo-400" />
                Hostname &amp; IP
              </div>
              <p className="text-sm font-medium dark:text-zinc-200 text-zinc-700 font-mono">{sysInfo.hostname}</p>
              <p className="text-xs dark:text-zinc-400 text-zinc-500 font-mono">{sysInfo.ip}</p>
            </div>
            {/* CF Tunnel */}
            <div className="glass-card p-5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                <Shield className="w-4 h-4 text-indigo-400" />
                CF Tunnel
              </div>
              <div className="pt-1">{statusBadge(sysInfo.cfTunnel)}</div>
            </div>
            {/* UFW Firewall */}
            <div className="glass-card p-5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                <Shield className="w-4 h-4 text-indigo-400" />
                UFW Firewall
              </div>
              <p className="text-sm font-medium dark:text-zinc-200 text-zinc-700">{sysInfo.ufwRules} rules</p>
              <div className="flex flex-wrap gap-1">
                {(sysInfo.ufwPorts || []).slice(0, 5).map(p => (
                  <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">{p}</span>
                ))}
                {(sysInfo.ufwPorts || []).length > 5 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                    +{sysInfo.ufwPorts.length - 5}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {/* ─── DISK CLEANUP ─── */}
      <section>
        <h2 className="text-lg font-semibold dark:text-zinc-200 text-zinc-700 flex items-center gap-2 mb-4">
          <HardDrive className="w-5 h-5 text-indigo-400" />
          Disk Cleanup
        </h2>
        {diskLoading ? (
          <div className="glass-card p-6 space-y-4">
            <Skeleton className="h-4 w-60" />
            <Skeleton className="h-5 w-full rounded-full" />
            <div className="space-y-2 mt-4">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
            </div>
          </div>
        ) : diskError ? (
          <ErrorBlock message={diskError} onRetry={fetchDiskInfo} />
        ) : diskInfo ? (
          <div className="glass-card p-6 space-y-6">
            {/* Usage overview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="dark:text-zinc-300 text-zinc-600 font-medium">Disk Usage</span>
                <span className="dark:text-zinc-400 text-zinc-500 font-mono text-xs">
                  {diskInfo.used} / {diskInfo.total} ({diskInfo.percent}%)
                </span>
              </div>
              <div className="w-full h-3 rounded-full dark:bg-zinc-800/80 bg-zinc-200 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${diskBarColor(diskInfo.percent)}`}
                  style={{ width: `${diskInfo.percent}%` }}
                />
              </div>
              <p className="text-xs dark:text-zinc-500 text-zinc-400">{diskInfo.free} free</p>
            </div>

            {/* Largest directories */}
            {diskInfo.largestDirs && diskInfo.largestDirs.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Top 10 Largest Directories</h3>
                <div className="space-y-2">
                  {diskInfo.largestDirs.slice(0, 10).map((dir, i) => (
                    <div key={dir.name} className="flex items-center gap-3">
                      <span className="text-xs text-zinc-600 w-4 text-right font-mono">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-mono dark:text-zinc-300 text-zinc-600 truncate mr-2">{dir.name}</span>
                          <span className="text-xs font-mono dark:text-zinc-400 text-zinc-500 flex-shrink-0">{dir.size}</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full dark:bg-zinc-800/60 bg-zinc-200 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${diskBarColor(diskInfo.percent)}`}
                            style={{ width: `${(dir.sizeBytes / maxDirSize) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => handleDiskAction('clean_logs')}
                disabled={diskAction === 'clean_logs'}
                className="px-4 py-2 rounded-xl text-sm font-medium dark:text-zinc-400 text-zinc-500 dark:hover:text-orange-300 hover:text-orange-600 dark:hover:bg-orange-500/10 hover:bg-orange-500/10 border dark:border-zinc-800/50 border-zinc-200/50 transition-colors inline-flex items-center gap-2 disabled:opacity-50"
              >
                {diskAction === 'clean_logs' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Clean old logs
              </button>
              <button
                onClick={() => handleDiskAction('clean_temp')}
                disabled={diskAction === 'clean_temp'}
                className="px-4 py-2 rounded-xl text-sm font-medium dark:text-zinc-400 text-zinc-500 dark:hover:text-orange-300 hover:text-orange-600 dark:hover:bg-orange-500/10 hover:bg-orange-500/10 border dark:border-zinc-800/50 border-zinc-200/50 transition-colors inline-flex items-center gap-2 disabled:opacity-50"
              >
                {diskAction === 'clean_temp' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Clean temp files
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {/* ─── MAINTENANCE LOG ─── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold dark:text-zinc-200 text-zinc-700 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            Maintenance Log
          </h2>
          <button
            onClick={handleCheckUpdates}
            disabled={updateChecking}
            className="px-4 py-2 rounded-xl text-sm font-medium dark:text-zinc-400 text-zinc-500 dark:hover:text-blue-300 hover:text-blue-600 dark:hover:bg-blue-500/10 hover:bg-blue-500/10 border dark:border-zinc-800/50 border-zinc-200/50 transition-colors inline-flex items-center gap-2 disabled:opacity-50"
          >
            {updateChecking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Check for Updates
          </button>
        </div>
        {logLoading ? (
          <div className="glass-card p-6 space-y-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
          </div>
        ) : logError ? (
          <ErrorBlock message={logError} onRetry={fetchMaintenanceLog} />
        ) : (
          <div className="glass-card overflow-hidden">
            {logEntries.length === 0 ? (
              <div className="p-8 text-center">
                <Clock className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                <p className="text-sm text-zinc-500">No maintenance log entries</p>
              </div>
            ) : (
              <div className="divide-y dark:divide-zinc-800/50 divide-zinc-200/50">
                {logEntries.slice(0, 20).map((entry, i) => (
                  <div key={i} className="px-4 py-3 flex items-start gap-3 dark:hover:bg-zinc-800/20 hover:bg-zinc-100 transition-colors">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex-shrink-0 mt-0.5 ${logLevelColor(entry.level)} ${logLevelBg(entry.level)}`}>
                      {entry.level}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm dark:text-zinc-300 text-zinc-600 break-words">{entry.message}</p>
                    </div>
                    <span className="text-xs font-mono dark:text-zinc-600 text-zinc-400 flex-shrink-0 mt-0.5">
                      {entry.timestamp}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

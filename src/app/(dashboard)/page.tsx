"use client";

import { useState, useEffect, useCallback } from 'react';
import StatsCard from '@/components/StatsCard';
import Badge from '@/components/Badge';
import { 
  Cpu, MemoryStick, HardDrive, Clock, Wifi, MessageSquare, 
  Zap, Activity, TrendingUp, Server, RotateCcw, Trash2, Play, Database,
  Send, Hash, Bell, MessageCircle, Radio, Home, RefreshCw, Loader2,
  CheckCircle, AlertCircle
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface SystemStats {
  cpu: { percent: number; cores: number; loadAvg: number };
  memory: { total: number; used: number; percent: number };
  disk: { total: number; used: number; percent: number };
  uptime: { days: number; hours: number; raw: number };
  gateway: { status: string };
  hermes: { version: string };
  hostname: string;
}

interface PlatformStatus {
  name: string;
  icon: any;
  connected: boolean;
  status: string;
  color: string;
  enabled?: boolean;
  lastActivity?: string;
  error?: string;
  apiKey?: string;
}

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(1)} GB`;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-2 text-xs dark:bg-zinc-900 bg-zinc-100 dark:border-zinc-700 border-zinc-200">
      <p className="dark:text-zinc-400 text-zinc-500">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {p.value}%</p>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [history, setHistory] = useState<Array<{ time: string; cpu: number; memory: number; disk: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [platforms, setPlatforms] = useState<PlatformStatus[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [restartingPlatform, setRestartingPlatform] = useState<string | null>(null);
  const [platformMessage, setPlatformMessage] = useState('');

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/system/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setHistory(prev => {
          const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const entry = { time: now, cpu: data.cpu.percent, memory: data.memory.percent, disk: data.disk.percent };
          const updated = [...prev, entry].slice(-60);
          return updated;
        });
      }
    } catch {}
    setLoading(false);
  }, []);

  const fetchPlatforms = useCallback(async () => {
    try {
      const res = await fetch('/api/platforms');
      if (res.ok) {
        const data = await res.json();
        const iconMap: Record<string, any> = {
          Telegram: Send, Discord: MessageCircle, Slack: Hash,
          WhatsApp: MessageSquare, Signal: Bell, 'Home Assistant': Home,
        };
        const colorMap: Record<string, string> = {
          Telegram: 'from-blue-500 to-sky-500',
          Discord: 'from-indigo-500 to-violet-500',
          Slack: 'from-purple-500 to-pink-500',
          WhatsApp: 'from-emerald-500 to-green-500',
          Signal: 'from-cyan-500 to-teal-500',
          'Home Assistant': 'from-amber-500 to-orange-500',
        };
        const platformList: PlatformStatus[] = (data.platforms || []).map((p: any) => ({
          name: p.name,
          icon: iconMap[p.name] || Radio,
          connected: p.connected,
          status: p.enabled ? (p.error || (p.connected ? 'Connected' : 'Disconnected')) : 'Disabled',
          color: colorMap[p.name] || 'from-zinc-500 to-zinc-600',
          enabled: p.enabled,
          lastActivity: p.lastActivity,
          error: p.error,
        }));
        setPlatforms(platformList);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchStats();
    fetchPlatforms();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [fetchStats, fetchPlatforms]);

  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const runAction = async (action: string) => {
    setActionLoading(action);
    setActionMessage(null);
    try {
      let url = '';
      let options: RequestInit = { method: 'POST' };

      if (action === 'restart') url = '/api/gateway/restart';
      else if (action === 'logs') url = '/api/logs';
      else if (action === 'cron') {
        url = '/api/cron';
        options = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'run-all' }),
        };
      }
      else if (action === 'backup') {
        url = '/api/backups';
        options = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create' }),
        };
      }

      const res = await fetch(url, options);
      const data = await res.json();

      if (res.ok) {
        setActionMessage({ text: data.message || `${action} completed`, type: 'success' });
        setTimeout(() => { fetchStats(); fetchPlatforms(); }, 2000);
      } else {
        setActionMessage({ text: data.error || `${action} failed`, type: 'error' });
      }
    } catch {
      setActionMessage({ text: 'Request failed — check network', type: 'error' });
    }
    setActionLoading(null);
    setTimeout(() => setActionMessage(null), 5000);
  };

  const restartPlatform = async (platformName: string) => {
    setRestartingPlatform(platformName);
    setPlatformMessage('');
    try {
      const platformKey = platformName.toLowerCase().replace(/\s+/g, '');
      const res = await fetch('/api/platforms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restart', platform: platformKey }),
      });
      const data = await res.json();
      if (res.ok) {
        setPlatformMessage(`${platformName} restart signal sent`);
        setTimeout(() => fetchPlatforms(), 5000);
      } else {
        setPlatformMessage(`Error: ${data.error}`);
      }
    } catch {
      setPlatformMessage('Failed to restart platform');
    }
    setRestartingPlatform(null);
    setTimeout(() => setPlatformMessage(''), 4000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center animate-pulse">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <p className="text-zinc-500 text-sm">Loading system stats...</p>
        </div>
      </div>
    );
  }

  if (!stats) return <p className="dark:text-zinc-400 text-zinc-500">Failed to load stats</p>;

  const gatewayOk = stats.gateway.status === 'active';

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold dark:text-zinc-100 text-zinc-900">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">
          System overview for <span className="dark:text-zinc-300 text-zinc-700">{stats.hostname}</span>
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => runAction('restart')}
          disabled={actionLoading === 'restart'}
          className="flex items-center gap-3 px-4 py-3 rounded-xl dark:bg-amber-500/10 bg-amber-50 dark:border-amber-500/20 border-amber-200 border dark:hover:bg-amber-500/20 hover:bg-amber-100 transition-all disabled:opacity-50"
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0">
            <RotateCcw className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium dark:text-zinc-200 text-zinc-800">Restart Gateway</p>
            <p className="text-xs dark:text-zinc-500 text-zinc-500">Systemctl restart</p>
          </div>
        </button>

        <button
          onClick={() => runAction('logs')}
          disabled={actionLoading === 'logs'}
          className="flex items-center gap-3 px-4 py-3 rounded-xl dark:bg-red-500/10 bg-red-50 dark:border-red-500/20 border-red-200 border dark:hover:bg-red-500/20 hover:bg-red-100 transition-all disabled:opacity-50"
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium dark:text-zinc-200 text-zinc-800">Clear Logs</p>
            <p className="text-xs dark:text-zinc-500 text-zinc-500">Free disk space</p>
          </div>
        </button>

        <button
          onClick={() => runAction('cron')}
          disabled={actionLoading === 'cron'}
          className="flex items-center gap-3 px-4 py-3 rounded-xl dark:bg-blue-500/10 bg-blue-50 dark:border-blue-500/20 border-blue-200 border dark:hover:bg-blue-500/20 hover:bg-blue-100 transition-all disabled:opacity-50"
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
            <Play className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium dark:text-zinc-200 text-zinc-800">Run All Cron Jobs</p>
            <p className="text-xs dark:text-zinc-500 text-zinc-500">Execute scheduled</p>
          </div>
        </button>

        <button
          onClick={() => runAction('backup')}
          disabled={actionLoading === 'backup'}
          className="flex items-center gap-3 px-4 py-3 rounded-xl dark:bg-emerald-500/10 bg-emerald-50 dark:border-emerald-500/20 border-emerald-200 border dark:hover:bg-emerald-500/20 hover:bg-emerald-100 transition-all disabled:opacity-50"
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
            <Database className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium dark:text-zinc-200 text-zinc-800">Take Backup</p>
            <p className="text-xs dark:text-zinc-500 text-zinc-500">Snapshot now</p>
          </div>
        </button>
      </div>

      {/* Action Feedback */}
      {actionMessage && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium animate-fade-in ${
          actionMessage.type === 'success'
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {actionLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : actionMessage.type === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {actionMessage.text}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="CPU Usage"
          value={`${stats.cpu.percent}%`}
          subtitle={`${stats.cpu.cores} cores · load ${stats.cpu.loadAvg.toFixed(2)}`}
          icon={Cpu}
          color="from-blue-500 to-cyan-500"
          trend={stats.cpu.percent > 80 ? 'down' : 'neutral'}
        />
        <StatsCard
          title="Memory"
          value={`${stats.memory.percent}%`}
          subtitle={`${formatBytes(stats.memory.used)} / ${formatBytes(stats.memory.total)}`}
          icon={MemoryStick}
          color="from-violet-500 to-purple-500"
          trend={stats.memory.percent > 80 ? 'down' : 'neutral'}
        />
        <StatsCard
          title="Disk Usage"
          value={`${stats.disk.percent}%`}
          subtitle={`${formatBytes(stats.disk.used)} / ${formatBytes(stats.disk.total)}`}
          icon={HardDrive}
          color="from-amber-500 to-orange-500"
          trend={stats.disk.percent > 90 ? 'down' : 'neutral'}
        />
        <StatsCard
          title="Uptime"
          value={`${stats.uptime.days}d ${stats.uptime.hours}h`}
          subtitle="System uptime"
          icon={Clock}
          color="from-emerald-500 to-teal-500"
          trend="up"
        />
      </div>

      {/* Gateway + Hermes row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard
          title="Gateway Status"
          value={gatewayOk ? 'Running' : stats.gateway.status}
          subtitle={gatewayOk ? 'All systems operational' : 'Check gateway service'}
          icon={Wifi}
          color={gatewayOk ? 'from-emerald-500 to-green-500' : 'from-red-500 to-rose-500'}
          trend={gatewayOk ? 'up' : 'down'}
        />
        <StatsCard
          title="Hermes Version"
          value={stats.hermes.version.replace('Hermes Agent v', 'v')}
          subtitle="AI Agent runtime"
          icon={Zap}
          color="from-indigo-500 to-violet-500"
        />
        <div className="glass-card p-5 animate-fade-in flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
            <Server className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm text-zinc-500 font-medium">Platform</p>
            <p className="text-lg font-bold dark:text-zinc-100 text-zinc-900">VPS Dashboard</p>
            <Badge variant="success">Online</Badge>
          </div>
        </div>
      </div>

      {/* Connected Platforms */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold dark:text-zinc-100 text-zinc-900">Connected Platforms</h2>
          </div>
          {platformMessage && (
            <Badge variant={platformMessage.includes('Error') ? 'error' : 'success'}>{platformMessage}</Badge>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {platforms.map((platform) => (
            <div
              key={platform.name}
              className="group relative flex flex-col items-center gap-2 p-4 rounded-xl dark:bg-zinc-800/30 bg-zinc-50 border dark:border-zinc-700/30 border-zinc-200 transition-all hover:border-indigo-500/20"
            >
              {/* Restart button - appears on hover */}
              {platform.enabled && (
                <button
                  onClick={() => restartPlatform(platform.name)}
                  disabled={restartingPlatform === platform.name}
                  className="absolute top-2 right-2 p-1.5 rounded-lg dark:bg-zinc-800/80 bg-zinc-100 border dark:border-zinc-700/50 border-zinc-200 opacity-0 group-hover:opacity-100 transition-all hover:bg-indigo-500/10 hover:border-indigo-500/30 disabled:opacity-100"
                  title={`Restart ${platform.name}`}
                >
                  {restartingPlatform === platform.name ? (
                    <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3 text-zinc-500 hover:text-indigo-400" />
                  )}
                </button>
              )}
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${platform.color} flex items-center justify-center ${!platform.enabled ? 'opacity-20' : !platform.connected ? 'opacity-40' : ''}`}>
                <platform.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-medium dark:text-zinc-300 text-zinc-700">{platform.name}</span>
              <Badge variant={platform.connected ? 'success' : platform.error ? 'error' : 'default'}>
                {platform.connected ? 'Connected' : platform.enabled ? 'Offline' : 'Disabled'}
              </Badge>
              {platform.lastActivity && (
                <span className="text-[10px] text-zinc-500">Last: {platform.lastActivity}</span>
              )}
              {platform.error && (
                <span className="text-[10px] text-red-400/80 text-center leading-tight">{platform.error}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Real-time Chart */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-semibold dark:text-zinc-100 text-zinc-900">Real-time Metrics</h2>
          <Badge variant="info">5s refresh</Badge>
        </div>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
              <defs>
                <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(220, 70%, 60%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(220, 70%, 60%)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(263, 70%, 58%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(263, 70%, 58%)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="time" 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: '#71717a', fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#71717a', fontSize: 10 }}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="cpu" stroke="hsl(220, 70%, 60%)" fill="url(#cpuGrad)" strokeWidth={2} name="CPU" />
              <Area type="monotone" dataKey="memory" stroke="hsl(263, 70%, 58%)" fill="url(#memGrad)" strokeWidth={2} name="Memory" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-6 mt-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-400" />
            <span className="text-xs text-zinc-500">CPU</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-indigo-400" />
            <span className="text-xs text-zinc-500">Memory</span>
          </div>
        </div>
      </div>

      {/* Individual Metric Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CPU Chart */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold dark:text-zinc-200 text-zinc-800">CPU Usage</h3>
            <span className="ml-auto text-xl font-bold dark:text-zinc-100 text-zinc-900">{stats.cpu.percent}%</span>
          </div>
          <div className="h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="cpuG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(220, 70%, 60%)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="hsl(220, 70%, 60%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <YAxis domain={[0, 100]} hide />
                <XAxis dataKey="time" hide />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="cpu" stroke="hsl(220, 70%, 60%)" fill="url(#cpuG)" strokeWidth={2} name="CPU" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between text-xs text-zinc-500 mt-2">
            <span>{stats.cpu.cores} cores</span>
            <span>Load: {stats.cpu.loadAvg.toFixed(2)}</span>
          </div>
        </div>

        {/* Memory Chart */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <MemoryStick className="w-4 h-4 text-violet-400" />
            <h3 className="text-sm font-semibold dark:text-zinc-200 text-zinc-800">Memory Usage</h3>
            <span className="ml-auto text-xl font-bold dark:text-zinc-100 text-zinc-900">{stats.memory.percent}%</span>
          </div>
          <div className="h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="memG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(263, 70%, 58%)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="hsl(263, 70%, 58%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <YAxis domain={[0, 100]} hide />
                <XAxis dataKey="time" hide />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="memory" stroke="hsl(263, 70%, 58%)" fill="url(#memG)" strokeWidth={2} name="Memory" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between text-xs text-zinc-500 mt-2">
            <span>{formatBytes(stats.memory.used)} used</span>
            <span>{formatBytes(stats.memory.total)} total</span>
          </div>
        </div>

        {/* Disk Chart */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <HardDrive className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold dark:text-zinc-200 text-zinc-800">Disk Usage</h3>
            <span className="ml-auto text-xl font-bold dark:text-zinc-100 text-zinc-900">{stats.disk.percent}%</span>
          </div>
          <div className="h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="diskG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <YAxis domain={[0, 100]} hide />
                <XAxis dataKey="time" hide />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="disk" stroke="hsl(38, 92%, 50%)" fill="url(#diskG)" strokeWidth={2} name="Disk" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between text-xs text-zinc-500 mt-2">
            <span>{formatBytes(stats.disk.used)} used</span>
            <span>{formatBytes(stats.disk.total)} total</span>
          </div>
        </div>
      </div>

      {/* Note */}
      <p className="text-xs dark:text-zinc-600 text-zinc-400 text-center pb-4">
        The restart button restarts the entire gateway service, not just a single platform.
        All connected platforms will briefly disconnect and reconnect automatically.
      </p>
    </div>
  );
}

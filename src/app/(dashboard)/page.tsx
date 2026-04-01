"use client";

import { useState, useEffect, useCallback } from 'react';
import StatsCard from '@/components/StatsCard';
import Badge from '@/components/Badge';
import { 
  Cpu, MemoryStick, HardDrive, Clock, Wifi, MessageSquare, 
  Zap, Activity, TrendingUp, Server
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

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(1)} GB`;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-2 text-xs bg-zinc-900 border border-zinc-700">
      <p className="text-zinc-400">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {p.value}%</p>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [history, setHistory] = useState<Array<{ time: string; cpu: number; memory: number }>>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/system/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setHistory(prev => {
          const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const entry = { time: now, cpu: data.cpu.percent, memory: data.memory.percent };
          const updated = [...prev, entry].slice(-60);
          return updated;
        });
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [fetchStats]);

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

  if (!stats) return <p className="text-zinc-400">Failed to load stats</p>;

  const gatewayOk = stats.gateway.status === 'active';

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">
          System overview for <span className="text-zinc-300">{stats.hostname}</span>
        </p>
      </div>

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
            <p className="text-lg font-bold text-zinc-100">VPS Dashboard</p>
            <Badge variant="success">Online</Badge>
          </div>
        </div>
      </div>

      {/* Real-time Chart */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Real-time Metrics</h2>
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
    </div>
  );
}

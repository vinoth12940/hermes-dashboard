"use client";

import { useState, useEffect, useCallback } from 'react';
import StatsCard from '@/components/StatsCard';
import Badge from '@/components/Badge';
import { CreditCard, TrendingUp, TrendingDown, ArrowUpDown } from 'lucide-react';

interface Lifetime {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  totalCacheWriteTokens: number;
  totalReasoningTokens: number;
  totalSessions: number;
  sessionsWithTokens: number;
  estimatedCost: number;
}

interface DailyRow {
  day: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  sessions: number;
}

interface ProviderRow {
  provider: string;
  sessions: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
}

interface TopSession {
  id: string;
  title: string;
  model: string;
  billing_provider: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
}

export default function UsagePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lifetime, setLifetime] = useState<Lifetime | null>(null);
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [topSessions, setTopSessions] = useState<TopSession[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/usage');
      if (!res.ok) throw new Error('Failed to fetch usage data');
      const data = await res.json();
      setLifetime(data.lifetime);
      setDaily(data.daily || []);
      setProviders(data.providers || []);
      setTopSessions(data.topSessions || []);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center animate-pulse">
            <CreditCard className="w-5 h-5 text-white" />
          </div>
          <p className="dark:text-zinc-400 text-zinc-500 text-sm">Loading usage data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold dark:text-zinc-100 text-zinc-900">Token Usage</h1>
            <p className="text-sm dark:text-zinc-400 text-zinc-500">Failed to load usage data</p>
          </div>
        </div>
        <div className="glass-card p-6">
          <p className="dark:text-red-400 text-red-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!lifetime) return null;

  const maxDailyTokens = daily.reduce((max, d) => Math.max(max, d.inputTokens + d.outputTokens), 1);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold dark:text-zinc-100 text-zinc-900">Token Usage</h1>
          <p className="text-sm dark:text-zinc-400 text-zinc-500">
            {lifetime.totalSessions} total sessions &middot; {lifetime.sessionsWithTokens} with token data
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatsCard
          title="Total Input Tokens"
          value={lifetime.totalInputTokens.toLocaleString()}
          icon={TrendingUp}
          color="from-indigo-500 to-blue-500"
        />
        <StatsCard
          title="Total Output Tokens"
          value={lifetime.totalOutputTokens.toLocaleString()}
          icon={TrendingDown}
          color="from-emerald-500 to-teal-500"
        />
        <StatsCard
          title="Cache Read Tokens"
          value={lifetime.totalCacheReadTokens.toLocaleString()}
          icon={ArrowUpDown}
          color="from-violet-500 to-purple-500"
        />
        <StatsCard
          title="Estimated Cost"
          value={`$${lifetime.estimatedCost.toFixed(2)}`}
          icon={CreditCard}
          color="from-amber-500 to-orange-500"
        />
      </div>

      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold dark:text-zinc-100 text-zinc-900 mb-1">Daily Usage (Last 30 Days)</h2>
        <p className="text-xs dark:text-zinc-400 text-zinc-500 mb-4">Input (indigo) and output (emerald) tokens per day</p>
        {daily.length === 0 ? (
          <p className="dark:text-zinc-500 text-zinc-400 text-sm py-8 text-center">No usage data in the last 30 days</p>
        ) : (
          <div className="flex items-end gap-1 h-48 overflow-x-auto pb-2">
            {daily.map((d) => {
              const total = d.inputTokens + d.outputTokens;
              const inputHeight = maxDailyTokens > 0 ? (d.inputTokens / maxDailyTokens) * 100 : 0;
              const outputHeight = maxDailyTokens > 0 ? (d.outputTokens / maxDailyTokens) * 100 : 0;
              return (
                <div key={d.day} className="flex flex-col items-center gap-1 flex-shrink-0 min-w-[32px]">
                  <span className="text-[9px] dark:text-zinc-400 text-zinc-500">
                    {total > 0 ? (total >= 1000000 ? `${(total / 1000000).toFixed(1)}M` : total >= 1000 ? `${(total / 1000).toFixed(0)}K` : total) : ''}
                  </span>
                  <div className="flex flex-col gap-px w-4" style={{ height: '140px' }}>
                    <div className="flex-1 flex flex-col justify-end">
                      <div
                        className="bg-indigo-500/70 rounded-t-sm w-full transition-all duration-300"
                        style={{ height: `${inputHeight}%`, minHeight: total > 0 ? '2px' : '0' }}
                      />
                    </div>
                    <div className="flex-1 flex flex-col justify-end">
                      <div
                        className="bg-emerald-500/70 rounded-b-sm w-full transition-all duration-300"
                        style={{ height: `${outputHeight}%`, minHeight: total > 0 ? '2px' : '0' }}
                      />
                    </div>
                  </div>
                  <span className="text-[9px] dark:text-zinc-500 text-zinc-400 w-full text-center truncate">
                    {d.day.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="glass-card overflow-hidden">
          <div className="p-5 border-b dark:border-zinc-800/50 border-zinc-200/50">
            <h2 className="text-lg font-semibold dark:text-zinc-100 text-zinc-900">Provider Breakdown</h2>
          </div>
          {providers.length === 0 ? (
            <p className="dark:text-zinc-500 text-zinc-400 text-sm py-8 text-center">No provider data</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b dark:border-zinc-800/50 border-zinc-200/50">
                    <th className="px-4 py-3 text-left text-xs font-medium dark:text-zinc-500 text-zinc-500 uppercase tracking-wider">Provider</th>
                    <th className="px-4 py-3 text-left text-xs font-medium dark:text-zinc-500 text-zinc-500 uppercase tracking-wider">Sessions</th>
                    <th className="px-4 py-3 text-right text-xs font-medium dark:text-zinc-500 text-zinc-500 uppercase tracking-wider">Input</th>
                    <th className="px-4 py-3 text-right text-xs font-medium dark:text-zinc-500 text-zinc-500 uppercase tracking-wider">Output</th>
                    <th className="px-4 py-3 text-right text-xs font-medium dark:text-zinc-500 text-zinc-500 uppercase tracking-wider">Est. Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-zinc-800/30 divide-zinc-200/50">
                  {providers.map((p) => (
                    <tr key={p.provider} className="dark:hover:bg-zinc-800/30 hover:bg-zinc-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium dark:text-zinc-200 text-zinc-800">{p.provider}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm dark:text-zinc-400 text-zinc-600">{p.sessions}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm dark:text-indigo-400 text-indigo-600">{p.inputTokens.toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm dark:text-emerald-400 text-emerald-600">{p.outputTokens.toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm dark:text-amber-400 text-amber-600">${p.estimatedCost.toFixed(2)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="glass-card overflow-hidden">
          <div className="p-5 border-b dark:border-zinc-800/50 border-zinc-200/50">
            <h2 className="text-lg font-semibold dark:text-zinc-100 text-zinc-900">Top Sessions by Input Tokens</h2>
          </div>
          {topSessions.length === 0 ? (
            <p className="dark:text-zinc-500 text-zinc-400 text-sm py-8 text-center">No session data</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b dark:border-zinc-800/50 border-zinc-200/50">
                    <th className="px-4 py-3 text-left text-xs font-medium dark:text-zinc-500 text-zinc-500 uppercase tracking-wider">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium dark:text-zinc-500 text-zinc-500 uppercase tracking-wider">Title</th>
                    <th className="px-4 py-3 text-right text-xs font-medium dark:text-zinc-500 text-zinc-500 uppercase tracking-wider">Input</th>
                    <th className="px-4 py-3 text-right text-xs font-medium dark:text-zinc-500 text-zinc-500 uppercase tracking-wider">Output</th>
                    <th className="px-4 py-3 text-left text-xs font-medium dark:text-zinc-500 text-zinc-500 uppercase tracking-wider">Provider</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-zinc-800/30 divide-zinc-200/50">
                  {topSessions.map((s, i) => (
                    <tr key={s.id} className="dark:hover:bg-zinc-800/30 hover:bg-zinc-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium dark:text-zinc-500 text-zinc-400">{i + 1}</span>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <span className="text-sm dark:text-zinc-200 text-zinc-800 truncate block">
                          {(s.title || `Session ${s.id.slice(-8)}`).slice(0, 40)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm dark:text-indigo-400 text-indigo-600">{s.inputTokens.toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm dark:text-emerald-400 text-emerald-600">{s.outputTokens.toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge>{s.billing_provider || 'unknown'}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

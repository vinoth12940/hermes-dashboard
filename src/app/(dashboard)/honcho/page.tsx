"use client";

import { useState, useEffect, useCallback } from 'react';
import StatsCard from '@/components/StatsCard';
import Badge from '@/components/Badge';
import { Globe, MessageSquare, FileText, Zap, Info } from 'lucide-react';

interface HonchoData {
  workspace_id: string | null;
  total_conclusions: number;
  total_sessions: number;
  total_messages: number;
  recent_memories: Array<{
    id: string;
    content: string;
    created_at: string | null;
    session_id: string | null;
  }>;
  status: string;
}

export default function HonchoPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<HonchoData | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/honcho');
      if (!res.ok) throw new Error('Failed to fetch Honcho data');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center animate-pulse">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <p className="dark:text-zinc-400 text-zinc-500 text-sm">Loading Honcho data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold dark:text-zinc-100 text-zinc-900">Honcho Memory</h1>
            <p className="text-sm dark:text-zinc-400 text-zinc-500">Failed to load Honcho data</p>
          </div>
        </div>
        <div className="glass-card p-6">
          <p className="dark:text-red-400 text-red-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
          <Globe className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold dark:text-zinc-100 text-zinc-900">Honcho Memory</h1>
          <p className="text-sm dark:text-zinc-400 text-zinc-500">
            {data.status === 'active' ? 'Connected' : 'Not configured'}{data.workspace_id ? ` \u00b7 Workspace: ${data.workspace_id.slice(0, 8)}` : ''}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatsCard
          title="Total Conclusions"
          value={data.total_conclusions.toLocaleString()}
          icon={FileText}
          color="from-violet-500 to-purple-500"
        />
        <StatsCard
          title="Total Sessions"
          value={data.total_sessions.toLocaleString()}
          icon={MessageSquare}
          color="from-blue-500 to-cyan-500"
        />
        <StatsCard
          title="Total Messages"
          value={data.total_messages.toLocaleString()}
          icon={Zap}
          color="from-emerald-500 to-teal-500"
        />
        <div className="glass-card p-5 animate-fade-in hover:border-emerald-500/20 transition-all duration-300 group">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm dark:text-zinc-500 text-zinc-500 font-medium">Status</p>
              <div className="mt-2">
                {data.status === 'active' ? (
                  <Badge variant="success" size="md">Active</Badge>
                ) : (
                  <Badge variant={data.status === 'no_key' ? 'warning' : 'error'} size="md">
                    {data.status === 'no_key' ? 'No API Key' : 'No Workspace'}
                  </Badge>
                )}
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
              <Globe className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-5 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm dark:text-zinc-300 text-zinc-700">
            Honcho provides long-term memory for Hermes. Memories are automatically extracted from conversations and stored as conclusions.
          </p>
          <p className="text-xs dark:text-zinc-500 text-zinc-400 mt-1">
            $100 free credits (limited time). Check <span className="dark:text-blue-400 text-blue-600 font-medium">honcho.dev/dashboard</span> for remaining credits.
          </p>
        </div>
      </div>

      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold dark:text-zinc-100 text-zinc-900 mb-1">Recent Memories</h2>
        <p className="text-xs dark:text-zinc-400 text-zinc-500 mb-4">Latest conclusions extracted from conversations</p>
        {data.recent_memories.length === 0 ? (
          <div className="p-8 text-center">
            <p className="dark:text-zinc-500 text-zinc-400 text-sm">No memories stored yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.recent_memories.map((mem) => (
              <div key={mem.id} className="dark:bg-zinc-800/40 bg-zinc-50 border dark:border-zinc-700/30 border-zinc-200 rounded-xl p-4">
                <p className="text-sm dark:text-zinc-200 text-zinc-800 whitespace-pre-wrap break-words line-clamp-4">
                  {mem.content}
                </p>
                {mem.created_at && (
                  <p className="text-xs dark:text-zinc-500 text-zinc-400 mt-2">
                    {new Date(mem.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

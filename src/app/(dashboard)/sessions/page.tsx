"use client";

import { useState, useEffect } from 'react';
import Badge from '@/components/Badge';
import { MessageSquare, Search, ChevronLeft, ArrowLeft, User, Bot, Wrench, Hash } from 'lucide-react';

interface Session {
  id: string;
  title: string;
  source: string;
  model: string;
  started_at: string;
  message_count: number;
  input_tokens: number;
  output_tokens: number;
}

interface Message {
  role: string;
  content: string;
  tool_calls?: string;
  timestamp: string;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 30;

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        limit: pageSize.toString(),
        offset: (page * pageSize).toString(),
      });
      const res = await fetch(`/api/sessions?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions);
        setTotal(data.total);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchMessages = async (sessionId: string) => {
    setLoadingMessages(true);
    setSelectedSession(sessionId);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
      }
    } catch (e) { console.error(e); }
    setLoadingMessages(false);
  };

  useEffect(() => {
    fetchSessions();
  }, [page]);

  useEffect(() => {
    setPage(0);
    fetchSessions();
  }, [search]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { 
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
      });
    } catch { return dateStr; }
  };

  const formatTokens = (n: number) => {
    if (!n) return '—';
    if (n > 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n > 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  };

  const truncate = (s: string, n: number) => s && s.length > n ? s.slice(0, n) + '...' : s || '—';

  if (selectedSession) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <button onClick={() => { setSelectedSession(null); setMessages([]); }} className="p-2 rounded-xl dark:text-zinc-500 text-zinc-600 dark:hover:text-zinc-200 hover:text-zinc-800 hover:text-zinc-800 dark:hover:bg-zinc-800/50 hover:bg-zinc-200/50 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold dark:text-zinc-100 text-zinc-900">Session {selectedSession.slice(0, 8)}</h1>
            <p className="text-sm text-zinc-500 mt-1">{messages.length} messages</p>
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          {loadingMessages ? (
            <div className="flex items-center justify-center h-64"><p className="text-zinc-500">Loading messages...</p></div>
          ) : (
            <div className="divide-y divide-zinc-800/30 max-h-[70vh] overflow-y-auto">
              {messages.map((msg, i) => {
                const isUser = msg.role === 'user';
                const isTool = msg.role === 'tool';
                return (
                  <div key={i} className={`p-4 ${isUser ? 'bg-indigo-500/5' : ''}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {isUser ? <User className="w-4 h-4 text-indigo-400" /> : 
                       isTool ? <Wrench className="w-4 h-4 text-amber-400" /> :
                       <Bot className="w-4 h-4 text-violet-400" />}
                      <Badge variant={isUser ? 'info' : isTool ? 'warning' : 'default'}>
                        {msg.role}
                      </Badge>
                      {msg.timestamp && <span className="text-xs text-zinc-600">{formatDate(msg.timestamp)}</span>}
                    </div>
                    <div className="text-sm dark:text-zinc-300 text-zinc-700 whitespace-pre-wrap break-words leading-relaxed">
                      {truncate(msg.content, 2000)}
                    </div>
                  </div>
                );
              })}
              {messages.length === 0 && (
                <div className="p-8 text-center text-zinc-500 text-sm">No messages found</div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold dark:text-zinc-100 text-zinc-900">Sessions</h1>
        <p className="text-sm text-zinc-500 mt-1">{total} total sessions</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search sessions..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl dark:bg-zinc-900/80 bg-zinc-100 border dark:border-zinc-800/50 border-zinc-200/50 dark:text-zinc-300 text-zinc-700 text-sm placeholder-zinc-600 focus:border-indigo-500/50 transition-colors"
        />
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64"><p className="text-zinc-500">Loading sessions...</p></div>
        ) : sessions.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-sm">No sessions found</div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b dark:border-zinc-800/50 border-zinc-200/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Session</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Platform</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Model</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Messages</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Tokens</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/30">
                  {sessions.map((session) => (
                    <tr 
                      key={session.id} 
                      onClick={() => fetchMessages(session.id)}
                      className="dark:hover:bg-zinc-800/30 hover:bg-zinc-100 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Hash className="w-3.5 h-3.5 text-zinc-600" />
                          <span className="text-sm dark:text-zinc-300 text-zinc-700 font-mono">{session.id?.slice(0, 8)}</span>
                          {session.title && (
                            <span className="text-xs text-zinc-500 truncate max-w-[150px]">— {session.title}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="info">{session.source || 'cli'}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs dark:text-zinc-400 text-zinc-500 font-mono">{session.model ? truncate(session.model, 30) : '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-sm dark:text-zinc-400 text-zinc-500">{session.message_count || '—'}</td>
                      <td className="px-4 py-3 text-sm dark:text-zinc-400 text-zinc-500">{formatTokens((session.input_tokens || 0) + (session.output_tokens || 0))}</td>
                      <td className="px-4 py-3 text-sm text-zinc-500">{formatDate(session.started_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="block md:hidden divide-y divide-zinc-800/30">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => fetchMessages(session.id)}
                  className="p-4 dark:hover:bg-zinc-800/30 hover:bg-zinc-100 cursor-pointer transition-colors active:bg-zinc-800/50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Hash className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                      <span className="text-sm dark:text-zinc-300 text-zinc-700 font-mono">{session.id?.slice(0, 8)}</span>
                    </div>
                    <Badge variant="info">{session.source || 'cli'}</Badge>
                  </div>
                  {session.title && (
                    <p className="text-xs text-zinc-500 truncate mb-2">{session.title}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs dark:text-zinc-400 text-zinc-500">
                    {session.model && (
                      <span className="font-mono truncate">{truncate(session.model, 20)}</span>
                    )}
                    <span>{session.message_count || 0} msgs</span>
                    <span>{formatTokens((session.input_tokens || 0) + (session.output_tokens || 0))} tokens</span>
                  </div>
                  <div className="text-[11px] text-zinc-600 mt-1.5">{formatDate(session.started_at)}</div>
                </div>
              ))}
            </div>

            {total > pageSize && (
              <div className="flex items-center justify-between px-4 py-3 border-t dark:border-zinc-800/50 border-zinc-200/50">
                <span className="text-xs text-zinc-500">{page * pageSize + 1}-{Math.min((page + 1) * pageSize, total)} of {total}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="px-3 py-1.5 rounded-lg text-xs dark:text-zinc-500 text-zinc-600 dark:hover:text-zinc-200 hover:text-zinc-800 hover:text-zinc-800 dark:hover:bg-zinc-800/50 hover:bg-zinc-200/50 disabled:opacity-30 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={(page + 1) * pageSize >= total}
                    className="px-3 py-1.5 rounded-lg text-xs dark:text-zinc-500 text-zinc-600 dark:hover:text-zinc-200 hover:text-zinc-800 hover:text-zinc-800 dark:hover:bg-zinc-800/50 hover:bg-zinc-200/50 disabled:opacity-30 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

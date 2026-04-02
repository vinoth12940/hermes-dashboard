"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import Badge from '@/components/Badge';
import { FileText, Search, Pause, Play, RotateCcw, Filter } from 'lucide-react';

interface LogLine {
  content: string;
  level?: string;
  timestamp?: string;
}

export default function LogsPage() {
  const [files, setFiles] = useState<string[]>([]);
  const [currentFile, setCurrentFile] = useState('maintenance.log');
  const [lines, setLines] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [totalLines, setTotalLines] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        file: currentFile,
        lines: '500',
        ...(search ? { search } : {}),
        ...(levelFilter ? { level: levelFilter } : {}),
      });
      const res = await fetch(`/api/logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files);
        setLines(data.lines);
        setTotalLines(data.totalLines);
      }
    } catch {}
    setLoading(false);
  }, [currentFile, search, levelFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines, autoScroll]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 100);
  };

  const getLineLevel = (line: string): string => {
    const upper = line.toUpperCase();
    if (upper.includes('ERROR') || upper.includes('CRITICAL') || upper.includes('FATAL')) return 'error';
    if (upper.includes('WARN') || upper.includes('WARNING')) return 'warn';
    if (upper.includes('INFO') || upper.includes('SUCCESS')) return 'info';
    if (upper.includes('DEBUG') || upper.includes('TRACE')) return 'debug';
    return '';
  };

  const levelColors: Record<string, string> = {
    error: 'text-red-400',
    warn: 'text-amber-400',
    info: 'text-blue-400',
    debug: 'text-zinc-500',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-zinc-100 text-zinc-900">Logs</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {totalLines} lines in {currentFile}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={autoRefresh ? 'success' : 'default'}>
            {autoRefresh ? 'Live' : 'Paused'}
          </Badge>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="p-2 rounded-xl dark:text-zinc-500 text-zinc-600 dark:hover:text-zinc-200 hover:text-zinc-800 hover:text-zinc-800 dark:hover:bg-zinc-800/50 hover:bg-zinc-200/50 border dark:border-zinc-800/50 border-zinc-200/50 transition-colors"
          >
            {autoRefresh ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={fetchLogs}
            className="p-2 rounded-xl dark:text-zinc-500 text-zinc-600 dark:hover:text-zinc-200 hover:text-zinc-800 hover:text-zinc-800 dark:hover:bg-zinc-800/50 hover:bg-zinc-200/50 border dark:border-zinc-800/50 border-zinc-200/50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        <select
          value={currentFile}
          onChange={(e) => { setCurrentFile(e.target.value); setLoading(true); }}
          className="px-4 py-2.5 rounded-xl dark:bg-zinc-900/80 bg-zinc-100 border dark:border-zinc-800/50 border-zinc-200/50 dark:text-zinc-300 text-zinc-700 text-sm focus:border-indigo-500/50 transition-colors"
        >
          {files.map(f => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>

        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search logs..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl dark:bg-zinc-900/80 bg-zinc-100 border dark:border-zinc-800/50 border-zinc-200/50 dark:text-zinc-300 text-zinc-700 text-sm placeholder-zinc-600 focus:border-indigo-500/50 transition-colors"
          />
        </div>

        <div className="flex gap-1">
          {['', 'ERROR', 'WARN', 'INFO', 'DEBUG'].map(level => (
            <button
              key={level || 'ALL'}
              onClick={() => setLevelFilter(level)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                levelFilter === level
                  ? level === 'ERROR' ? 'bg-red-500/20 text-red-400 border border-red-500/20'
                    : level === 'WARN' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20'
                    : level === 'INFO' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20'
                    : level === 'DEBUG' ? 'bg-zinc-500/20 dark:text-zinc-400 text-zinc-500 border border-zinc-500/20'
                    : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20'
                  : 'dark:text-zinc-500 text-zinc-600 dark:hover:text-zinc-300 hover:text-zinc-700 hover:text-zinc-700 dark:hover:bg-zinc-800/50 hover:bg-zinc-200/50 border border-transparent'
              }`}
            >
              {level || 'ALL'}
            </button>
          ))}
        </div>
      </div>

      {/* Log content */}
      <div className="glass-card overflow-hidden">
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-[60vh] overflow-y-auto p-4 font-mono text-xs leading-relaxed"
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-zinc-500">Loading logs...</p>
            </div>
          ) : lines.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-zinc-500">No matching log entries</p>
            </div>
          ) : (
            lines.map((line, i) => {
              const level = getLineLevel(line);
              return (
                <div key={i} className={`py-0.5 dark:hover:bg-zinc-800/30 hover:bg-zinc-100 px-2 rounded ${levelColors[level] || 'dark:text-zinc-500 text-zinc-600'}`}>
                  <span className="text-zinc-600 mr-3 select-none">{i + 1}</span>
                  <span>{line}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

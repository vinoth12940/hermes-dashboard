"use client";

import { useState, useEffect } from 'react';
import Badge from '@/components/Badge';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Clock, Play, Pause, Trash2, RefreshCw, Plus, Calendar, AlertCircle, CheckCircle } from 'lucide-react';

interface CronJob {
  id?: string;
  name?: string;
  schedule?: string | { kind: string; expr: string; display: string; minutes?: number };
  schedule_display?: string;
  prompt?: string;
  skills?: string[];
  skill?: string;
  model?: string;
  provider?: string;
  state?: string;
  status?: string;
  enabled?: boolean;
  deliver?: string;
  origin?: string | { platform?: string; chat_id?: string; chat_name?: string };
  last_run_at?: string;
  next_run_at?: string;
  last_status?: string;
  last_error?: string;
  paused_at?: string;
  paused_reason?: string;
  created_at?: string;
  repeat?: number | null | { times?: number | null; completed?: number };
  [key: string]: any;
}

export default function CronPage() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ type: string; job: CronJob } | null>(null);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cron');
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleAction = async (action: string, job: CronJob) => {
    try {
      const res = await fetch('/api/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, jobId: job.id }),
      });
      const data = await res.json();
      setMessage(data.error || data.message || `${action} completed`);
      if (res.ok) fetchJobs();
    } catch {
      setMessage('Action failed');
    }
    setConfirmAction(null);
    setTimeout(() => setMessage(''), 3000);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Never';
    try {
      return new Date(dateStr).toLocaleString('en-US', { 
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
      });
    } catch { return dateStr; }
  };

  const truncate = (s: string, n: number) => s && s.length > n ? s.slice(0, n) + '...' : s || '—';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Cron Jobs</h1>
          <p className="text-sm text-zinc-500 mt-1">{jobs.length} scheduled jobs</p>
        </div>
        <div className="flex items-center gap-3">
          {message && <Badge variant={message.includes('fail') || message.includes('error') ? 'error' : 'success'}>{message}</Badge>}
          <button
            onClick={fetchJobs}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border border-zinc-800/50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><p className="text-zinc-500">Loading cron jobs...</p></div>
      ) : jobs.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Calendar className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-400 mb-2">No Cron Jobs</h3>
          <p className="text-sm text-zinc-600">Create jobs using the Hermes CLI: <code className="bg-zinc-800 px-2 py-0.5 rounded">hermes cron create</code></p>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job, i) => (
            <div key={job.id || i} className="glass-card p-5 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-sm font-semibold text-zinc-200 truncate">{job.name || 'Unnamed Job'}</h3>
                    <Badge variant={job.enabled !== false ? 'success' : 'warning'}>
                      {job.enabled !== false ? 'Active' : 'Paused'}
                    </Badge>
                    {job.deliver && <Badge variant="info">{job.deliver}</Badge>}
                  </div>
                  {job.schedule_display && (
                    <p className="text-xs text-zinc-500 font-mono mb-2">Schedule: {job.schedule_display}</p>
                  )}
                  {job.state && (
                    <span className="text-xs text-zinc-600 mb-1 block">State: {job.state}</span>
                  )}
                  {job.prompt && (
                    <p className="text-xs text-zinc-600 line-clamp-2">{truncate(job.prompt, 150)}</p>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
                    {job.last_run_at && (
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Last: {formatDate(job.last_run_at)}
                      </span>
                    )}
                    {job.last_status && (
                      <Badge variant={job.last_status === 'success' ? 'success' : job.last_status === 'error' ? 'error' : 'info'}>
                        {job.last_status}
                      </Badge>
                    )}
                    {job.last_error && (
                      <span className="text-red-400 truncate max-w-xs">{job.last_error}</span>
                    )}
                    {job.next_run_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Next: {formatDate(job.next_run_at)}
                      </span>
                    )}
                    {typeof job.repeat === 'object' && job.repeat !== null ? (
                      <span>Runs: {job.repeat.completed ?? 0}{job.repeat.times ? `/${job.repeat.times}` : ''}</span>
                    ) : typeof job.repeat === 'number' ? (
                      <span>Repeat: {job.repeat === 0 ? 'forever' : job.repeat}</span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmAction}
        title={`${confirmAction?.type || 'Action'} Job`}
        message={`Are you sure you want to ${confirmAction?.type?.toLowerCase()} "${confirmAction?.job?.name || 'this job'}"?`}
        confirmText={confirmAction?.type || 'Confirm'}
        variant={confirmAction?.type === 'delete' ? 'danger' : 'primary'}
        onConfirm={() => confirmAction && handleAction(confirmAction.type, confirmAction.job)}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}

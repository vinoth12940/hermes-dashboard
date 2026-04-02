"use client";

import { useState, useEffect } from 'react';
import Badge from '@/components/Badge';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
  Clock, Play, Pause, Trash2, RefreshCw, Plus, Calendar,
  AlertCircle, CheckCircle, Square, ChevronDown, ChevronUp,
  Save, Loader2, X, Edit3
} from 'lucide-react';

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
  history?: Array<{ timestamp: string; success: boolean }>;
  [key: string]: any;
}

export default function CronPage() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [confirmAction, setConfirmAction] = useState<{ type: string; job: CronJob } | null>(null);
  const [runningJob, setRunningJob] = useState<string | null>(null);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null);
  const [promptDraft, setPromptDraft] = useState('');
  const [savingPrompt, setSavingPrompt] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newJob, setNewJob] = useState({ name: '', schedule: '', prompt: '', deliver: '', model: '', provider: '' });
  const [creating, setCreating] = useState(false);

  const SCHEDULE_PRESETS = [
    { label: 'Every 30 min', value: 'every 30 min' },
    { label: 'Every hour', value: 'every 1 hour' },
    { label: 'Every 6 hours', value: 'every 6 hours' },
    { label: 'Daily at 9 AM', value: '0 9 * * *' },
    { label: 'Daily at 6 PM', value: '0 18 * * *' },
    { label: 'Weekly Monday', value: '0 9 * * 1' },
  ];

  const DELIVER_PRESETS = [
    { label: 'Telegram (Home)', value: 'origin' },
    { label: 'Telegram (Direct)', value: 'telegram' },
    { label: 'Local only', value: 'local' },
  ];

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

  const showMessage = (msg: string, type: 'success' | 'error' = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 4000);
  };

  const handleAction = async (action: string, job: CronJob) => {
    try {
      const res = await fetch('/api/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, jobId: job.id }),
      });
      const data = await res.json();
      showMessage(data.error || data.message || `${action} completed`, data.error ? 'error' : 'success');
      if (res.ok) fetchJobs();
    } catch {
      showMessage('Action failed', 'error');
    }
    setConfirmAction(null);
  };

  const handleRunNow = async (job: CronJob) => {
    if (!job.id) return;
    setRunningJob(job.id);
    try {
      const res = await fetch('/api/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run', jobId: job.id }),
      });
      const data = await res.json();
      showMessage(data.message || `Job "${job.name}" triggered`, data.error ? 'error' : 'success');
      if (res.ok) fetchJobs();
    } catch {
      showMessage('Failed to trigger job', 'error');
    }
    setRunningJob(null);
  };

  const handlePauseResume = async (job: CronJob) => {
    if (!job.id) return;
    const action = job.enabled !== false ? 'pause' : 'resume';
    setActionLoading(`${action}-${job.id}`);
    try {
      const res = await fetch('/api/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, jobId: job.id }),
      });
      const data = await res.json();
      showMessage(data.message || `Job ${action}d`, data.error ? 'error' : 'success');
      if (res.ok) fetchJobs();
    } catch {
      showMessage(`Failed to ${action} job`, 'error');
    }
    setActionLoading(null);
  };

  const startEditPrompt = (job: CronJob) => {
    setEditingPrompt(job.id || null);
    setPromptDraft(job.prompt || '');
  };

  const cancelEditPrompt = () => {
    setEditingPrompt(null);
    setPromptDraft('');
  };

  const savePrompt = async (job: CronJob) => {
    if (!job.id || editingPrompt !== job.id) return;
    setSavingPrompt(job.id);
    try {
      const res = await fetch('/api/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', jobId: job.id, job: { prompt: promptDraft } }),
      });
      const data = await res.json();
      showMessage(data.message || 'Prompt updated', data.error ? 'error' : 'success');
      if (res.ok) {
        setEditingPrompt(null);
        setPromptDraft('');
        fetchJobs();
      }
    } catch {
      showMessage('Failed to update prompt', 'error');
    }
    setSavingPrompt(null);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Never';
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch { return dateStr; }
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    } catch { return dateStr; }
  };

  const truncate = (s: string, n: number) => s && s.length > n ? s.slice(0, n) + '...' : s || '—';

  const handleCreateJob = async () => {
    if (!newJob.name.trim() || !newJob.schedule.trim()) {
      showMessage('Name and schedule are required', 'error');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', job: newJob }),
      });
      const data = await res.json();
      if (res.ok) {
        showMessage(`Job "${newJob.name}" created!`, 'success');
        setNewJob({ name: '', schedule: '', prompt: '', deliver: '', model: '', provider: '' });
        setShowAddForm(false);
        fetchJobs();
      } else {
        showMessage(data.error || 'Failed to create job', 'error');
      }
    } catch {
      showMessage('Failed to create job', 'error');
    }
    setCreating(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-zinc-100 text-zinc-900">Cron Jobs</h1>
          <p className="text-sm text-zinc-500 mt-1">{jobs.length} scheduled jobs</p>
        </div>
        <div className="flex items-center gap-3">
          {message && (
            <Badge variant={messageType === 'error' ? 'error' : 'success'}>{message}</Badge>
          )}
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
              showAddForm
                ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                : 'dark:text-zinc-400 text-zinc-700 dark:hover:text-zinc-200 hover:text-zinc-800 dark:hover:bg-zinc-800/50 hover:bg-zinc-200/50 border dark:border-zinc-800/50 border-zinc-200/50'
            }`}
          >
            <Plus className="w-4 h-4" />
            Add Job
          </button>
          <button
            onClick={fetchJobs}
            className="p-2 rounded-xl dark:text-zinc-500 text-zinc-600 dark:hover:text-zinc-200 hover:text-zinc-800 dark:hover:bg-zinc-800/50 hover:bg-zinc-200/50 border dark:border-zinc-800/50 border-zinc-200/50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Add Job Form */}
      {showAddForm && (
        <div className="glass-card p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold dark:text-zinc-200 text-zinc-800">Create New Cron Job</h2>
            <button onClick={() => setShowAddForm(false)} className="p-1 rounded-lg dark:text-zinc-500 text-zinc-500 dark:hover:text-zinc-300 hover:text-zinc-700 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="text-xs font-medium dark:text-zinc-400 text-zinc-600 mb-1.5 block">Job Name *</label>
              <input
                type="text"
                value={newJob.name}
                onChange={(e) => setNewJob(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Daily Market Briefing"
                className="w-full px-4 py-2.5 rounded-xl dark:bg-zinc-900/80 bg-zinc-50 border dark:border-zinc-800/50 border-zinc-200/50 dark:text-zinc-200 text-zinc-800 text-sm placeholder-zinc-600 focus:border-indigo-500/50 transition-colors"
              />
            </div>

            {/* Schedule with presets */}
            <div>
              <label className="text-xs font-medium dark:text-zinc-400 text-zinc-600 mb-1.5 block">Schedule *</label>
              <input
                type="text"
                value={newJob.schedule}
                onChange={(e) => setNewJob(p => ({ ...p, schedule: e.target.value }))}
                placeholder="e.g. every 30 min, 0 9 * * *, or 6h"
                className="w-full px-4 py-2.5 rounded-xl dark:bg-zinc-900/80 bg-zinc-50 border dark:border-zinc-800/50 border-zinc-200/50 dark:text-zinc-200 text-zinc-800 text-sm font-mono placeholder-zinc-600 focus:border-indigo-500/50 transition-colors"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {SCHEDULE_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => setNewJob(p => ({ ...p, schedule: preset.value }))}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      newJob.schedule === preset.value
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'dark:text-zinc-500 text-zinc-600 dark:hover:text-zinc-300 hover:text-zinc-800 dark:bg-zinc-800/30 bg-zinc-100 border dark:border-zinc-700/30 border-zinc-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt */}
            <div>
              <label className="text-xs font-medium dark:text-zinc-400 text-zinc-600 mb-1.5 block">Prompt</label>
              <textarea
                value={newJob.prompt}
                onChange={(e) => setNewJob(p => ({ ...p, prompt: e.target.value }))}
                placeholder="What should the cron job do? Be specific and self-contained..."
                rows={4}
                className="w-full px-4 py-2.5 rounded-xl dark:bg-zinc-900/80 bg-zinc-50 border dark:border-zinc-800/50 border-zinc-200/50 dark:text-zinc-200 text-zinc-800 text-sm font-mono placeholder-zinc-600 resize-none focus:border-indigo-500/50 transition-colors"
              />
            </div>

            {/* Deliver + Model row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium dark:text-zinc-400 text-zinc-600 mb-1.5 block">Deliver To</label>
                <select
                  value={newJob.deliver}
                  onChange={(e) => setNewJob(p => ({ ...p, deliver: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl dark:bg-zinc-900/80 bg-zinc-50 border dark:border-zinc-800/50 border-zinc-200/50 dark:text-zinc-200 text-zinc-800 text-sm focus:border-indigo-500/50 transition-colors"
                >
                  <option value="">Default</option>
                  {DELIVER_PRESETS.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium dark:text-zinc-400 text-zinc-600 mb-1.5 block">Model (optional)</label>
                <input
                  type="text"
                  value={newJob.model}
                  onChange={(e) => setNewJob(p => ({ ...p, model: e.target.value }))}
                  placeholder="e.g. glm-5-turbo"
                  className="w-full px-4 py-2.5 rounded-xl dark:bg-zinc-900/80 bg-zinc-50 border dark:border-zinc-800/50 border-zinc-200/50 dark:text-zinc-200 text-zinc-800 text-sm font-mono placeholder-zinc-600 focus:border-indigo-500/50 transition-colors"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setShowAddForm(false); setNewJob({ name: '', schedule: '', prompt: '', deliver: '', model: '', provider: '' }); }}
                className="px-5 py-2.5 rounded-xl text-sm font-medium dark:text-zinc-400 text-zinc-600 dark:hover:text-zinc-200 hover:text-zinc-800 dark:hover:bg-zinc-800/50 hover:bg-zinc-200/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateJob}
                disabled={creating || !newJob.name.trim() || !newJob.schedule.trim()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-medium text-sm hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-40"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {creating ? 'Creating...' : 'Create Job'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64"><p className="text-zinc-500">Loading cron jobs...</p></div>
      ) : jobs.length === 0 && !showAddForm ? (
        <div className="glass-card p-12 text-center">
          <Calendar className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium dark:text-zinc-400 text-zinc-500 mb-2">No Cron Jobs</h3>
          <p className="text-sm text-zinc-600 mb-4">Create scheduled tasks that run automatically</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-medium text-sm hover:opacity-90 transition-all flex items-center gap-2 mx-auto"
          >
            <Plus className="w-4 h-4" />
            Create First Job
          </button>
        </div>
      ) : jobs.length === 0 ? (
        <></>
      ) : (
        <div className="space-y-4">
          {jobs.map((job, i) => {
            const isExpanded = expandedJob === job.id;
            const isEditing = editingPrompt === job.id;
            const isRunning = runningJob === job.id;
            const isActioning = actionLoading?.endsWith(job.id || '');
            const history = job.history || [];

            return (
              <div
                key={job.id || i}
                className="glass-card p-5 animate-fade-in"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-sm font-semibold dark:text-zinc-200 text-zinc-800 truncate">
                        {job.name || 'Unnamed Job'}
                      </h3>
                      <Badge variant={job.enabled !== false ? 'success' : 'warning'}>
                        {job.enabled !== false ? 'Active' : 'Paused'}
                      </Badge>
                      {job.deliver && <Badge variant="info">{job.deliver}</Badge>}
                      {job.model && <Badge variant="default">{job.model}</Badge>}
                    </div>
                    {job.schedule_display && (
                      <p className="text-xs text-zinc-500 font-mono mb-2">
                        Schedule: {job.schedule_display}
                      </p>
                    )}
                    {job.state && (
                      <span className="text-xs text-zinc-600 mb-1 block">State: {job.state}</span>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleRunNow(job)}
                      disabled={isRunning || job.enabled === false}
                      title="Run Now"
                      className="p-2 rounded-xl text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20 transition-all disabled:opacity-30"
                    >
                      {isRunning ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handlePauseResume(job)}
                      disabled={!!isActioning}
                      title={job.enabled !== false ? 'Pause' : 'Resume'}
                      className={`p-2 rounded-xl border transition-all disabled:opacity-50 ${
                        job.enabled !== false
                          ? 'text-amber-400 hover:bg-amber-500/10 border-amber-500/20'
                          : 'text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/20'
                      }`}
                    >
                      {isActioning ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : job.enabled !== false ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => setConfirmAction({ type: 'delete', job })}
                      title="Delete"
                      className="p-2 rounded-xl text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Prompt section - collapsible */}
                {job.prompt && (
                  <div className="mt-3">
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={promptDraft}
                          onChange={(e) => setPromptDraft(e.target.value)}
                          className="w-full h-32 dark:bg-zinc-900/80 bg-zinc-50 dark:text-zinc-300 text-zinc-700 text-sm p-3 rounded-xl border dark:border-zinc-700/50 border-zinc-200/50 resize-y font-mono focus:border-indigo-500/50"
                          placeholder="Job prompt..."
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={cancelEditPrompt}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium dark:text-zinc-400 text-zinc-600 dark:hover:text-zinc-200 hover:text-zinc-800 dark:hover:bg-zinc-800/50 hover:bg-zinc-200/50 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => savePrompt(job)}
                            disabled={savingPrompt === job.id}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:opacity-90 transition-all flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {savingPrompt === job.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Save className="w-3 h-3" />
                            )}
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="group relative cursor-pointer rounded-xl p-3 dark:bg-zinc-900/30 bg-zinc-50/80 border dark:border-zinc-800/30 border-zinc-200/30 hover:border-indigo-500/30 transition-colors"
                        onClick={() => setExpandedJob(isExpanded ? null : job.id || null)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs dark:text-zinc-400 text-zinc-600 font-mono whitespace-pre-wrap break-words leading-relaxed">
                            {isExpanded ? job.prompt : truncate(job.prompt, 200)}
                          </p>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); startEditPrompt(job); }}
                              className="p-1 rounded-lg text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors opacity-0 group-hover:opacity-100"
                              title="Edit prompt"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            {job.prompt && job.prompt.length > 200 && (
                              isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 text-zinc-500" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Run History Timeline */}
                {history.length > 0 && (
                  <div className="mt-3 flex items-center gap-3">
                    <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider flex-shrink-0">
                      History
                    </span>
                    <div className="flex items-center gap-1.5" title={history.map(h => `${formatTime(h.timestamp)}: ${h.success ? 'OK' : 'FAIL'}`).join('\n')}>
                      {history.slice(0, 8).map((run, hi) => (
                        <div
                          key={hi}
                          className="group/dot relative"
                          title={`${formatTime(run.timestamp)} - ${run.success ? 'Success' : 'Failed'}`}
                        >
                          <div
                            className={`w-2.5 h-2.5 rounded-full ${
                              run.success
                                ? 'bg-emerald-400'
                                : 'bg-red-400'
                            }`}
                          />
                          {hi < Math.min(history.length, 8) - 1 && (
                            <div className="absolute top-1/2 left-full w-2 h-px dark:bg-zinc-700 bg-zinc-300 -translate-y-1/2" />
                          )}
                        </div>
                      ))}
                    </div>
                    <span className="text-[10px] text-zinc-500 ml-auto flex-shrink-0">
                      {history.filter(h => h.success).length}/{history.length} success
                    </span>
                  </div>
                )}

                {/* Status footer */}
                <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500 flex-wrap">
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
            );
          })}
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

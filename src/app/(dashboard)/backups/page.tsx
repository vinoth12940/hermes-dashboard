"use client";

import { useState, useEffect } from 'react';
import Badge from '@/components/Badge';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Database, Download, Trash2, RotateCcw, HardDrive } from 'lucide-react';

interface Backup {
  filename: string;
  size: number;
  created_at: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function BackupsPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [confirmRestore, setConfirmRestore] = useState<Backup | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Backup | null>(null);

  const fetchBackups = async () => {
    try {
      const res = await fetch('/api/backups');
      if (res.ok) {
        const data = await res.json();
        setBackups(data.backups || []);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const createBackup = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create' }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessage('Backup created: ' + data.filename);
        await fetchBackups();
      } else {
        const data = await res.json();
        setMessage(`Error: ${data.error}`);
      }
    } catch {
      setMessage('Failed to create backup');
    }
    setCreating(false);
    setTimeout(() => setMessage(''), 5000);
  };

  const restoreBackup = async (filename: string) => {
    setRestoring(filename);
    try {
      const res = await fetch('/api/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore', filename }),
      });
      if (res.ok) {
        setMessage('Backup restored successfully');
      } else {
        const data = await res.json();
        setMessage(`Error: ${data.error}`);
      }
    } catch {
      setMessage('Failed to restore backup');
    }
    setRestoring(null);
    setConfirmRestore(null);
    setTimeout(() => setMessage(''), 5000);
  };

  const deleteBackup = async (filename: string) => {
    setDeleting(filename);
    try {
      const res = await fetch('/api/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', filename }),
      });
      if (res.ok) {
        setMessage('Backup deleted');
        await fetchBackups();
      } else {
        const data = await res.json();
        setMessage(`Error: ${data.error}`);
      }
    } catch {
      setMessage('Failed to delete backup');
    }
    setDeleting(null);
    setConfirmDelete(null);
    setTimeout(() => setMessage(''), 3000);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-zinc-500">Loading backups...</p></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-zinc-100 text-zinc-900">Config Backups</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage configuration snapshots</p>
        </div>
        <div className="flex items-center gap-3">
          {message && (
            <Badge variant={message.includes('Error') || message.includes('Failed') ? 'error' : 'success'}>{message}</Badge>
          )}
          <button
            onClick={createBackup}
            disabled={creating}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-medium text-sm hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Database className="w-4 h-4" />
            {creating ? 'Creating...' : 'Create Backup'}
          </button>
        </div>
      </div>

      {backups.length === 0 ? (
        <div className="glass-card p-8 text-center text-zinc-500">
          <HardDrive className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No backups found. Create your first backup to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {backups.map((backup) => (
            <div key={backup.filename} className="glass-card p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center flex-shrink-0 border border-indigo-500/20">
                  <Database className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium dark:text-zinc-300 text-zinc-800 truncate">{backup.filename}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-zinc-500">
                      {new Date(backup.created_at).toLocaleString()}
                    </span>
                    <span className="text-xs dark:text-zinc-600 text-zinc-500">{formatBytes(backup.size)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setConfirmRestore(backup)}
                  disabled={restoring === backup.filename}
                  className="p-2.5 rounded-xl text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10 border dark:border-zinc-800/50 border-zinc-200/50 transition-colors disabled:opacity-50"
                  title="Restore this backup"
                >
                  <RotateCcw className={`w-4 h-4 ${restoring === backup.filename ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setConfirmDelete(backup)}
                  disabled={deleting === backup.filename}
                  className="p-2.5 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10 border dark:border-zinc-800/50 border-zinc-200/50 transition-colors disabled:opacity-50"
                  title="Delete this backup"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmRestore}
        title="Restore Backup"
        message={`This will overwrite the current config.yaml with the backup from ${confirmRestore ? new Date(confirmRestore.created_at).toLocaleString() : ''}. This action cannot be undone. It is recommended to create a new backup first.`}
        confirmText="Restore"
        variant="danger"
        onConfirm={() => confirmRestore && restoreBackup(confirmRestore.filename)}
        onCancel={() => setConfirmRestore(null)}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Backup"
        message={`Delete backup "${confirmDelete?.filename}"? This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        onConfirm={() => confirmDelete && deleteBackup(confirmDelete.filename)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

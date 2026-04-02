"use client";

import { useState, useEffect } from 'react';
import Badge from '@/components/Badge';
import { Heart, Save, RotateCcw } from 'lucide-react';

export default function SoulMDPage() {
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [filePath, setFilePath] = useState('');

  useEffect(() => {
    fetchFile();
  }, []);

  const fetchFile = async () => {
    try {
      const res = await fetch('/api/soul-md');
      if (res.ok) {
        const data = await res.json();
        setContent(data.content);
        setOriginalContent(data.content);
        setFilePath(data.path);
      } else {
        const data = await res.json();
        setSaveMessage(`Error: ${data.error}`);
      }
    } catch {
      setSaveMessage('Failed to load SOUL.md');
    }
    setLoading(false);
  };

  const saveFile = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/soul-md', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        setSaveMessage('Saved successfully');
        setOriginalContent(content);
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        const data = await res.json();
        setSaveMessage(`Error: ${data.error}`);
      }
    } catch {
      setSaveMessage('Failed to save');
    }
    setSaving(false);
  };

  const hasChanges = content !== originalContent;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-zinc-500">Loading SOUL.md...</p></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-zinc-100 text-zinc-900 flex items-center gap-3">
            <Heart className="w-7 h-7 text-pink-400" />
            Soul MD
          </h1>
          <p className="text-sm text-zinc-500 mt-1">{filePath}</p>
        </div>
        <div className="flex items-center gap-3">
          {saveMessage && (
            <Badge variant={saveMessage.includes('Error') ? 'error' : 'success'}>{saveMessage}</Badge>
          )}
          {hasChanges && (
            <Badge variant="warning">Unsaved changes</Badge>
          )}
          <button
            onClick={() => { setContent(originalContent); setSaveMessage(''); }}
            disabled={!hasChanges}
            className="px-4 py-2 rounded-xl text-sm font-medium dark:text-zinc-400 text-zinc-800 dark:hover:text-zinc-200 hover:text-zinc-800 hover:text-zinc-600 dark:hover:bg-zinc-800/50 hover:bg-zinc-200/50 border dark:border-zinc-800/50 border-zinc-200/50 transition-colors flex items-center gap-2 disabled:opacity-30"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={saveFile}
            disabled={saving || !hasChanges}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 text-white font-medium text-sm hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="glass-card p-6">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-[70vh] dark:bg-zinc-900/80 bg-zinc-50/80 dark:text-zinc-600 text-zinc-500 font-mono text-sm p-4 rounded-xl border dark:border-zinc-800/50 border-zinc-200/50 resize-none focus:border-pink-500/50 leading-relaxed"
          spellCheck={false}
          placeholder="Loading SOUL.md..."
        />
      </div>

      <div className="text-xs dark:text-zinc-600 text-zinc-500">
        {content.split('\n').length} lines · {content.length} chars
      </div>
    </div>
  );
}

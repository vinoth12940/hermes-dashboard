"use client";

import { useState, useEffect } from 'react';
import Badge from '@/components/Badge';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Brain, User, Save, RotateCcw, Sparkles } from 'lucide-react';

type TabType = 'user' | 'memory' | 'soul';

export default function MemoryPage() {
  const [userContent, setUserContent] = useState('');
  const [memoryContent, setMemoryContent] = useState('');
  const [soulContent, setSoulContent] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('user');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [originalUser, setOriginalUser] = useState('');
  const [originalMemory, setOriginalMemory] = useState('');
  const [originalSoul, setOriginalSoul] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    fetchMemory();
  }, []);

  const fetchMemory = async () => {
    try {
      const res = await fetch('/api/memory');
      if (res.ok) {
        const data = await res.json();
        setUserContent(data.userContent || '');
        setMemoryContent(data.memoryContent || '');
        setSoulContent(data.soulContent || '');
        setOriginalUser(data.userContent || '');
        setOriginalMemory(data.memoryContent || '');
        setOriginalSoul(data.soulContent || '');
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const getContent = (): string => {
    switch (activeTab) {
      case 'user': return userContent;
      case 'memory': return memoryContent;
      case 'soul': return soulContent;
    }
  };

  const getOriginal = (): string => {
    switch (activeTab) {
      case 'user': return originalUser;
      case 'memory': return originalMemory;
      case 'soul': return originalSoul;
    }
  };

  const setContent = (val: string) => {
    switch (activeTab) {
      case 'user': setUserContent(val); break;
      case 'memory': setMemoryContent(val); break;
      case 'soul': setSoulContent(val); break;
    }
  };

  const setOriginal = (val: string) => {
    switch (activeTab) {
      case 'user': setOriginalUser(val); break;
      case 'memory': setOriginalMemory(val); break;
      case 'soul': setOriginalSoul(val); break;
    }
  };

  const saveMemory = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/memory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: activeTab, content: getContent() }),
      });
      if (res.ok) {
        setMessage('Saved successfully');
        setOriginal(getContent());
      } else {
        setMessage('Failed to save');
      }
    } catch {
      setMessage('Save error');
    }
    setSaving(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleReset = () => {
    setContent(getOriginal());
    setConfirmReset(false);
  };

  const hasChanges = getContent() !== getOriginal();

  const charCount = getContent().length;
  const maxChars = activeTab === 'user' ? 2750 : activeTab === 'memory' ? 4400 : 5000;
  const usagePercent = Math.round((charCount / maxChars) * 100);

  const tabConfig: { id: TabType; label: string; icon: typeof User }[] = [
    { id: 'user', label: 'User Profile', icon: User },
    { id: 'memory', label: 'Agent Memory', icon: Brain },
    { id: 'soul', label: 'Soul.md', icon: Sparkles },
  ];

  const fileNames: Record<TabType, string> = {
    user: 'USER.md',
    memory: 'MEMORY.md',
    soul: 'SOUL.md',
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-zinc-500">Loading memory...</p></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-zinc-100 text-zinc-900">Memory</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage agent memory, user profile, and soul</p>
        </div>
        <div className="flex items-center gap-3">
          {message && <Badge variant={message.includes('Fail') ? 'error' : 'success'}>{message}</Badge>}
          {hasChanges && (
            <Badge variant="warning">Unsaved changes</Badge>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabConfig.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-indigo-500/15 to-violet-500/15 text-white border border-indigo-500/20'
                  : 'dark:text-zinc-400 text-zinc-800 dark:hover:text-zinc-200 hover:text-zinc-800 hover:text-zinc-600 dark:hover:bg-zinc-800/50 hover:bg-zinc-200/50 border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Usage bar */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-zinc-500">
            {fileNames[activeTab]} usage
          </span>
          <span className="text-xs text-zinc-500">{charCount.toLocaleString()} / {maxChars.toLocaleString()} chars</span>
        </div>
        <div className="h-2 dark:bg-zinc-800 bg-zinc-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              usagePercent > 90 ? 'bg-red-500' : usagePercent > 70 ? 'bg-amber-500' : 'bg-gradient-to-r from-indigo-500 to-violet-500'
            }`}
            style={{ width: `${Math.min(usagePercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Editor */}
      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b dark:border-zinc-800/50 border-zinc-200/50">
          <h3 className="text-sm font-semibold dark:text-zinc-600 text-zinc-500">{fileNames[activeTab]}</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmReset(true)}
              disabled={!hasChanges}
              className="p-2 rounded-xl dark:text-zinc-600 dark:text-zinc-500 text-zinc-600 dark:hover:text-zinc-300 hover:text-zinc-700 hover:text-zinc-700 dark:hover:bg-zinc-800/50 hover:bg-zinc-200/50 transition-colors disabled:opacity-30"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={saveMemory}
              disabled={!hasChanges || saving}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-medium text-sm hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
        <textarea
          value={getContent()}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-[50vh] dark:bg-zinc-900/50 bg-zinc-50 dark:text-zinc-600 text-zinc-500 font-mono text-sm p-4 resize-none border-none focus:ring-0"
          spellCheck={false}
          placeholder="No content yet..."
        />
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reset Changes"
        message="Discard all unsaved changes?"
        confirmText="Reset"
        variant="danger"
        onConfirm={handleReset}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}

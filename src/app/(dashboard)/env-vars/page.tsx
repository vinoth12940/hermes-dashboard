"use client";

import { useState, useEffect } from 'react';
import Badge from '@/components/Badge';
import { Key, Plus, Trash2, Save, Eye, EyeOff, Search } from 'lucide-react';

interface EnvVar {
  key: string;
  value: string;
  category: string;
}

const CATEGORIES = [
  { id: 'all', label: 'All', color: 'dark:text-zinc-400 text-zinc-500' },
  { id: 'provider', label: 'Providers', color: 'text-indigo-400' },
  { id: 'messaging', label: 'Messaging', color: 'text-emerald-400' },
  { id: 'tools', label: 'Tools', color: 'text-violet-400' },
  { id: 'email', label: 'Email', color: 'text-blue-400' },
  { id: 'voice', label: 'Voice', color: 'text-amber-400' },
  { id: 'other', label: 'Other', color: 'text-zinc-500' },
];

export default function EnvVarsPage() {
  const [vars, setVars] = useState<EnvVar[]>([]);
  const [raw, setRaw] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('all');
  const [showSecrets, setShowSecrets] = useState<Set<string>>(new Set());
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => { fetchVars(); }, []);

  const fetchVars = async () => {
    try {
      const res = await fetch('/api/env-vars');
      if (res.ok) {
        const data = await res.json();
        setVars(data.vars || []);
        setRaw(data.raw || '');
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const isSecret = (key: string) => {
    const k = key.toUpperCase();
    return k.includes('KEY') || k.includes('TOKEN') || k.includes('SECRET') || k.includes('PASSWORD');
  };

  const maskValue = (val: string) => {
    if (val.length <= 8) return '••••••••';
    return val.slice(0, 4) + '•'.repeat(Math.min(val.length - 8, 16)) + val.slice(-4);
  };

  const toggleSecret = (key: string) => {
    setShowSecrets(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const startEdit = (v: EnvVar) => {
    setEditingKey(v.key);
    setEditValue(v.value);
  };

  const saveEdit = () => {
    if (!editingKey) return;
    setVars(prev => prev.map(v => v.key === editingKey ? { ...v, value: editValue } : v));
    setEditingKey(null);
    rebuildRaw();
    setHasChanges(true);
  };

  const deleteVar = (key: string) => {
    setVars(prev => prev.filter(v => v.key !== key));
    rebuildRaw();
    setHasChanges(true);
  };

  const addVar = () => {
    if (!newKey.trim()) return;
    setVars(prev => [...prev, { key: newKey.trim(), value: newValue, category: 'other' }]);
    setNewKey('');
    setNewValue('');
    setShowAdd(false);
    rebuildRaw();
    setHasChanges(true);
  };

  const rebuildRaw = () => {
    // We rebuild on save
  };

  const saveAll = async () => {
    setSaving(true);
    const newRaw = vars.map(v => `${v.key}=${v.value}`).join('\n') + '\n';
    try {
      const res = await fetch('/api/env-vars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: newRaw }),
      });
      if (res.ok) {
        setSaveMsg('Saved successfully');
        setRaw(newRaw);
        setHasChanges(false);
        setTimeout(() => setSaveMsg(''), 3000);
      } else {
        const data = await res.json();
        setSaveMsg(`Error: ${data.error}`);
      }
    } catch {
      setSaveMsg('Failed to save');
    }
    setSaving(false);
  };

  const filtered = vars.filter(v => {
    if (activeCat !== 'all' && v.category !== activeCat) return false;
    if (search && !v.key.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const catCounts = CATEGORIES.reduce((acc, cat) => {
    if (cat.id === 'all') acc[cat.id] = vars.length;
    else acc[cat.id] = vars.filter(v => v.category === cat.id).length;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-zinc-500">Loading environment variables...</p></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-zinc-100 text-zinc-900 flex items-center gap-3">
            <Key className="w-7 h-7 text-indigo-400" />
            Environment Variables
          </h1>
          <p className="text-sm text-zinc-500 mt-1">{vars.length} variables in ~/.hermes/.env</p>
        </div>
        <div className="flex items-center gap-3">
          {saveMsg && (
            <Badge variant={saveMsg.includes('Error') ? 'error' : 'success'}>{saveMsg}</Badge>
          )}
          {hasChanges && (
            <Badge variant="warning">Unsaved changes</Badge>
          )}
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="px-4 py-2 rounded-xl text-sm font-medium dark:text-zinc-500 text-zinc-600 dark:hover:text-zinc-200 hover:text-zinc-800 hover:text-zinc-800 dark:hover:bg-zinc-800/50 hover:bg-zinc-200/50 border dark:border-zinc-800/50 border-zinc-200/50 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
          <button
            onClick={saveAll}
            disabled={saving || !hasChanges}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-medium text-sm hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save All'}
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="glass-card p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="KEY_NAME"
            className="w-full md:flex-1 px-3 py-2 rounded-xl dark:bg-zinc-900/80 bg-zinc-100 border dark:border-zinc-800/50 border-zinc-200/50 dark:text-zinc-300 text-zinc-700 text-sm font-mono placeholder-zinc-600 focus:border-indigo-500/50 transition-colors"
          />
          <input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="value"
            className="w-full md:flex-[2] px-3 py-2 rounded-xl dark:bg-zinc-900/80 bg-zinc-100 border dark:border-zinc-800/50 border-zinc-200/50 dark:text-zinc-300 text-zinc-700 text-sm font-mono placeholder-zinc-600 focus:border-indigo-500/50 transition-colors"
          />
          <div className="flex gap-3">
            <button onClick={addVar} className="flex-1 md:flex-none px-4 py-2 rounded-xl bg-indigo-500/20 text-indigo-400 text-sm font-medium hover:bg-indigo-500/30 transition-colors">
              Add
            </button>
            <button onClick={() => setShowAdd(false)} className="flex-1 md:flex-none px-4 py-2 rounded-xl text-zinc-500 text-sm dark:hover:text-zinc-300 hover:text-zinc-700 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search variables..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl dark:bg-zinc-900/80 bg-zinc-100 border dark:border-zinc-800/50 border-zinc-200/50 dark:text-zinc-300 text-zinc-700 text-sm placeholder-zinc-600 focus:border-indigo-500/50 transition-colors"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCat(cat.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeCat === cat.id
                ? 'bg-gradient-to-r from-indigo-500/15 to-violet-500/15 text-white border border-indigo-500/20'
                : 'dark:text-zinc-500 text-zinc-600 dark:hover:text-zinc-200 hover:text-zinc-800 hover:text-zinc-800 dark:hover:bg-zinc-800/50 hover:bg-zinc-200/50 border border-transparent'
            }`}
          >
            <span className={cat.color}>{cat.label}</span>
            <span className="text-xs opacity-60">{catCounts[cat.id] || 0}</span>
          </button>
        ))}
      </div>

      <div className="glass-card overflow-hidden divide-y divide-zinc-800/30">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Key className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500 text-sm">No variables found</p>
          </div>
        ) : (
          filtered.map(v => (
            <div key={v.key} className="flex flex-col md:flex-row md:items-center gap-3 px-4 py-3 dark:hover:bg-zinc-800/20 hover:bg-zinc-100 transition-colors group">
              <div className="flex items-center justify-between md:justify-start">
                <span className="text-sm font-mono dark:text-zinc-300 text-zinc-700 shrink-0 md:w-48 lg:min-w-[200px]">{v.key}</span>
                <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  {isSecret(v.key) && (
                    <button onClick={() => toggleSecret(v.key)} className="p-1.5 rounded-lg dark:text-zinc-500 text-zinc-600 dark:hover:text-zinc-300 hover:text-zinc-700 hover:text-zinc-700 dark:hover:bg-zinc-800/50 hover:bg-zinc-200/50 transition-colors">
                      {showSecrets.has(v.key) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  <Badge variant={
                    v.category === 'provider' ? 'info' :
                    v.category === 'messaging' ? 'success' :
                    v.category === 'tools' ? 'default' :
                    v.category === 'email' ? 'info' :
                    v.category === 'voice' ? 'warning' : 'default'
                  } size="sm">{v.category}</Badge>
                  <button onClick={() => deleteVar(v.key)} className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {editingKey === v.key ? (
                <input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                  onBlur={saveEdit}
                  autoFocus
                  className="w-full md:flex-1 px-3 py-1 rounded-lg dark:bg-zinc-900/80 bg-zinc-100 border border-indigo-500/50 dark:text-zinc-300 text-zinc-700 text-sm font-mono focus:border-indigo-500/50 transition-colors"
                />
              ) : (
                <div className="w-full" onClick={() => startEdit(v)}>
                  <code className="text-xs font-mono dark:text-zinc-400 text-zinc-500 cursor-pointer dark:hover:text-zinc-300 hover:text-zinc-700 transition-colors break-all block">
                    {isSecret(v.key) && !showSecrets.has(v.key)
                      ? maskValue(v.value)
                      : v.value || <span className="text-zinc-600 italic">empty</span>
                    }
                  </code>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

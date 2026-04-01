"use client";

import { useState, useEffect } from 'react';
import Badge from '@/components/Badge';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Settings, Key, Cpu, Monitor, Shield, Save, RefreshCw, Eye, EyeOff } from 'lucide-react';

const tabs = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'models', label: 'Models', icon: Cpu },
  { id: 'apikeys', label: 'API Keys', icon: Key },
  { id: 'display', label: 'Display', icon: Monitor },
  { id: 'gateway', label: 'Gateway', icon: Shield },
];

interface ConfigSection {
  title: string;
  content: string;
}

export default function ConfigPage() {
  const [config, setConfig] = useState<Record<string, any> | null>(null);
  const [rawConfig, setRawConfig] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [showRaw, setShowRaw] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Set<string>>(new Set());
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [restarting, setRestarting] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        setRawConfig(data.raw);
      }
    } catch {}
    setLoading(false);
  };

  const saveConfig = async (newRaw: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: newRaw }),
      });
      if (res.ok) {
        setSaveMessage('Configuration saved successfully');
        setTimeout(() => setSaveMessage(''), 3000);
        await fetchConfig();
      } else {
        const data = await res.json();
        setSaveMessage(`Error: ${data.error}`);
      }
    } catch {
      setSaveMessage('Failed to save configuration');
    }
    setSaving(false);
  };

  const restartGateway = async () => {
    setRestarting(true);
    try {
      const res = await fetch('/api/gateway/restart', { method: 'POST' });
      const data = await res.json();
      setSaveMessage(data.success ? 'Gateway restarted!' : `Error: ${data.error}`);
    } catch {
      setSaveMessage('Failed to restart gateway');
    }
    setRestarting(false);
    setConfirmRestart(false);
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const toggleSecret = (key: string) => {
    setShowSecrets(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isSecret = (key: string) => 
    key.toLowerCase().includes('key') || key.toLowerCase().includes('token') || key.toLowerCase().includes('secret');

  const renderValue = (key: string, value: any, path: string = '') => {
    if (value === null || value === undefined) return <span className="text-zinc-600 italic">null</span>;
    if (typeof value === 'boolean') return <Badge variant={value ? 'success' : 'warning'}>{value.toString()}</Badge>;
    if (typeof value === 'number') return <span className="text-indigo-300">{value}</span>;
    if (typeof value === 'string') {
      const fullKey = path ? `${path}.${key}` : key;
      if (isSecret(fullKey)) {
        const masked = showSecrets.has(fullKey) ? value : '••••••••••••';
        return (
          <div className="flex items-center gap-2">
            <code className="text-xs bg-zinc-800/80 px-2 py-1 rounded font-mono text-zinc-300">{masked}</code>
            <button onClick={() => toggleSecret(fullKey)} className="text-zinc-500 hover:text-zinc-300">
              {showSecrets.has(fullKey) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        );
      }
      return <code className="text-xs bg-zinc-800/80 px-2 py-1 rounded font-mono text-zinc-300">{value}</code>;
    }
    if (Array.isArray(value)) {
      return (
        <div className="space-y-1">
          {value.map((item, i) => (
            <div key={i} className="pl-4 border-l border-zinc-800">
              {typeof item === 'object' ? renderObject(item, `${path}.${key}[${i}]`) : (
                <code className="text-xs bg-zinc-800/80 px-2 py-1 rounded font-mono text-zinc-300">{String(item)}</code>
              )}
            </div>
          ))}
        </div>
      );
    }
    if (typeof value === 'object') {
      return renderObject(value, path ? `${path}.${key}` : key);
    }
    return <span className="text-zinc-400">{String(value)}</span>;
  };

  const renderObject = (obj: Record<string, any>, path: string) => (
    <div className="space-y-2">
      {Object.entries(obj).map(([k, v]) => (
        <div key={k} className="flex flex-col gap-1">
          <span className="text-xs text-zinc-500 font-medium">{k}</span>
          {renderValue(k, v, path)}
        </div>
      ))}
    </div>
  );

  const getTabContent = () => {
    if (!config) return null;
    
    const tabMap: Record<string, string[]> = {
      general: ['model', 'provider', 'agent', 'timezone', 'security', 'privacy', 'compression', 'toolsets', 'skills'],
      models: ['auxiliary', 'smart_model_routing', 'model'],
      apikeys: [],
      display: ['display', 'streaming', 'personality', 'voice', 'stt', 'tts'],
      gateway: ['telegram', 'discord', 'slack', 'whatsapp', 'signal', 'homeassistant'],
    };

    if (activeTab === 'apikeys') {
      // Find all secret values
      const secrets: Array<{ key: string; value: string; path: string }> = [];
      const findSecrets = (obj: any, prefix: string = '') => {
        if (!obj || typeof obj !== 'object') return;
        Object.entries(obj).forEach(([k, v]) => {
          const fullKey = prefix ? `${prefix}.${k}` : k;
          if (typeof v === 'string' && isSecret(fullKey)) {
            secrets.push({ key: k, value: v, path: fullKey });
          } else if (typeof v === 'object') {
            findSecrets(v, fullKey);
          }
        });
      };
      findSecrets(config);

      return (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-300">Discovered API Keys & Secrets</h3>
          {secrets.length === 0 ? (
            <p className="text-zinc-500 text-sm">No API keys found in config. Keys are stored in .env file.</p>
          ) : (
            secrets.map((s, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
                <div>
                  <p className="text-sm font-medium text-zinc-300">{s.key}</p>
                  <p className="text-xs text-zinc-600">{s.path}</p>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-zinc-400">
                    {showSecrets.has(s.path) ? s.value.slice(0, 8) + '...' + s.value.slice(-4) : '••••••••'}
                  </code>
                  <button onClick={() => toggleSecret(s.path)} className="text-zinc-500 hover:text-zinc-300">
                    {showSecrets.has(s.path) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))
          )}
          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <p className="text-xs text-amber-400/80">
              API keys are primarily stored in <code className="bg-zinc-800 px-1 rounded">~/.hermes/.env</code>. 
              Use the Files page to edit that file directly.
            </p>
          </div>
        </div>
      );
    }

    const keys = tabMap[activeTab] || [];
    const filtered: Record<string, any> = {};
    keys.forEach(k => {
      if (config[k] !== undefined) filtered[k] = config[k];
    });

    return (
      <div className="space-y-3">
        {Object.keys(filtered).length === 0 ? (
          <p className="text-zinc-500 text-sm">No settings found for this section.</p>
        ) : (
          Object.entries(filtered).map(([k, v]) => (
            <div key={k} className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
              <span className="text-sm font-semibold text-zinc-300 block mb-2">{k}</span>
              {renderValue(k, v, k)}
            </div>
          ))
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-zinc-500">Loading configuration...</p></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Configuration</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage Hermes settings and API keys</p>
        </div>
        <div className="flex items-center gap-3">
          {saveMessage && (
            <Badge variant={saveMessage.includes('Error') ? 'error' : 'success'}>{saveMessage}</Badge>
          )}
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border border-zinc-800/50 transition-colors"
          >
            {showRaw ? 'Structured' : 'Raw YAML'}
          </button>
          <button
            onClick={() => setConfirmRestart(true)}
            className="px-4 py-2 rounded-xl text-sm font-medium text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/20 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Restart Gateway
          </button>
        </div>
      </div>

      {showRaw ? (
        <div className="glass-card p-6">
          <textarea
            value={rawConfig}
            onChange={(e) => setRawConfig(e.target.value)}
            className="w-full h-[60vh] bg-zinc-900/80 text-zinc-300 font-mono text-sm p-4 rounded-xl border border-zinc-800/50 resize-none focus:border-indigo-500/50"
            spellCheck={false}
          />
          <div className="flex justify-end mt-4">
            <button
              onClick={() => saveConfig(rawConfig)}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-medium text-sm hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Config'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-indigo-500/15 to-violet-500/15 text-white border border-indigo-500/20'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="glass-card p-6">
            {getTabContent()}
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmRestart}
        title="Restart Gateway"
        message="This will restart the Hermes gateway service. Active connections may be briefly interrupted. Continue?"
        confirmText={restarting ? 'Restarting...' : 'Restart'}
        variant="danger"
        onConfirm={restartGateway}
        onCancel={() => setConfirmRestart(false)}
      />
    </div>
  );
}

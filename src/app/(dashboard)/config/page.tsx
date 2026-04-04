"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import Badge from '@/components/Badge';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Settings, Key, Cpu, Monitor, Shield, Save, RefreshCw, Eye, EyeOff, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

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

interface ValidationResult {
  valid: boolean;
  error?: string;
  errors?: string[];
  warnings?: string[];
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
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

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
        setHasUnsavedChanges(false);
        setValidation(null);
      }
    } catch {}
    setLoading(false);
  };

  const validateConfig = async (yamlStr: string): Promise<ValidationResult | null> => {
    setValidating(true);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: yamlStr, validateOnly: true }),
      });
      const data = await res.json();
      setValidation(data);
      return data;
    } catch {
      const result = { valid: false, error: 'Validation request failed' };
      setValidation(result);
      return result;
    } finally {
      setValidating(false);
    }
  };

  // Auto-debounce validation on raw config changes
  const handleRawChange = useCallback((value: string) => {
    setRawConfig(value);
    setHasUnsavedChanges(true);

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce validation: 2 seconds after last keystroke
    debounceRef.current = setTimeout(() => {
      validateConfig(value);
    }, 2000);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const saveConfig = async (newRaw: string) => {
    // Run validation first
    const result = await validateConfig(newRaw);
    if (result && !result.valid) {
      setSaveMessage('Cannot save: config has critical errors — fix them first');
      setTimeout(() => setSaveMessage(''), 5000);
      return;
    }
    setSaving(true);
    try {
      // Auto-backup before save
      await fetch('/api/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create' }),
      }).catch(() => {});
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: newRaw }),
      });
      if (res.ok) {
        setSaveMessage('Configuration saved successfully');
        setValidation(null);
        setHasUnsavedChanges(false);
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
    if (value === null || value === undefined) return <span className="dark:text-zinc-600 text-zinc-500 italic">null</span>;
    if (typeof value === 'boolean') return <Badge variant={value ? 'success' : 'warning'}>{value.toString()}</Badge>;
    if (typeof value === 'number') return <span className="text-indigo-300">{value}</span>;
    if (typeof value === 'string') {
      const fullKey = path ? `${path}.${key}` : key;
      if (isSecret(fullKey)) {
        const masked = showSecrets.has(fullKey) ? value : '••••••••••••';
        return (
          <div className="flex items-center gap-2 min-w-0">
            <code className="text-xs dark:bg-zinc-800/80 bg-zinc-200/80 px-2 py-1 rounded font-mono dark:text-zinc-300 text-zinc-600 break-all min-w-0">{masked}</code>
            <button onClick={() => toggleSecret(fullKey)} className="text-zinc-500 dark:hover:text-zinc-300 hover:text-zinc-700 transition-colors">
              {showSecrets.has(fullKey) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        );
      }
      return <code className="text-xs dark:bg-zinc-800/80 bg-zinc-200/80 px-2 py-1 rounded font-mono dark:text-zinc-300 text-zinc-600 break-all block">{value}</code>;
    }
    if (Array.isArray(value)) {
      return (
        <div className="space-y-1">
          {value.map((item, i) => (
            <div key={i} className="pl-4 border-l dark:border-zinc-800 border-zinc-200">
              {typeof item === 'object' ? renderObject(item, `${path}.${key}[${i}]`) : (
                <code className="text-xs dark:bg-zinc-800/80 bg-zinc-200/80 px-2 py-1 rounded font-mono dark:text-zinc-300 text-zinc-600 break-all">{String(item)}</code>
              )}
            </div>
          ))}
        </div>
      );
    }
    if (typeof value === 'object') {
      return renderObject(value, path ? `${path}.${key}` : key);
    }
    return <span className="text-zinc-500">{String(value)}</span>;
  };

  const renderObject = (obj: Record<string, any>, path: string) => (
    <div className="space-y-2 min-w-0">
      {Object.entries(obj).map(([k, v]) => (
        <div key={k} className="flex flex-col gap-1 min-w-0">
          <span className="text-xs text-zinc-500 font-medium truncate">{k}</span>
          <div className="min-w-0">{renderValue(k, v, path)}</div>
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
          <h3 className="text-sm font-semibold dark:text-zinc-300 text-zinc-700">Discovered API Keys & Secrets</h3>
          {secrets.length === 0 ? (
            <p className="text-zinc-500 text-sm">No API keys found in config. Keys are stored in .env file.</p>
          ) : (
            secrets.map((s, i) => (
              <div key={i} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 p-3 rounded-xl dark:bg-zinc-900/50 bg-zinc-50 border dark:border-zinc-800/50 border-zinc-200/50">
                <div>
                  <p className="text-sm font-medium dark:text-zinc-300 text-zinc-700">{s.key}</p>
                  <p className="text-xs dark:text-zinc-500 text-zinc-500 break-all">{s.path}</p>
                </div>
                <div className="flex items-center gap-2 md:ml-auto">
                  <code className="text-xs font-mono text-zinc-500 break-all">
                    {showSecrets.has(s.path) ? s.value.slice(0, 8) + '...' + s.value.slice(-4) : '••••••••'}
                  </code>
                  <button onClick={() => toggleSecret(s.path)} className="text-zinc-500 dark:hover:text-zinc-300 hover:text-zinc-700 transition-colors shrink-0">
                    {showSecrets.has(s.path) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))
          )}
          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <p className="text-xs text-amber-400/80">
              API keys are primarily stored in <code className="dark:bg-zinc-800 bg-zinc-100 px-1 rounded">~/.hermes/.env</code>.
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
            <div key={k} className="p-4 rounded-xl dark:bg-zinc-900/50 bg-zinc-50 border dark:border-zinc-800/50 border-zinc-200/50 min-w-0 overflow-hidden">
              <span className="text-sm font-semibold dark:text-zinc-300 text-zinc-700 block mb-2 truncate">{k}</span>
              <div className="min-w-0">{renderValue(k, v, k)}</div>
            </div>
          ))
        )}
      </div>
    );
  };

  const warningCount = (validation?.warnings?.length || 0) + (validation?.errors?.length || 0);

  const renderValidationResult = () => {
    if (!validation) return null;

    // Critical errors
    if (validation.errors && validation.errors.length > 0) {
      return (
        <div className="space-y-2">
          {validation.errors.map((err, i) => (
            <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm">
              <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-red-300 font-medium text-xs">Critical Error</p>
                <p className="text-red-400/80 text-xs mt-1">{err}</p>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (!validation.valid && validation.error) {
      return (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm">
          <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-red-300 font-medium">Validation failed</p>
            <p className="text-red-400/80 text-xs mt-1">{validation.error}</p>
          </div>
          <button onClick={() => setValidation(null)} className="ml-auto text-zinc-500 dark:hover:text-zinc-300 hover:text-zinc-700 shrink-0">
            <XCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }

    // Warnings
    if (validation.warnings && validation.warnings.length > 0) {
      return (
        <div className="space-y-2">
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-amber-300 font-medium">Valid with {validation.warnings.length} warning{validation.warnings.length > 1 ? 's' : ''}</p>
              <ul className="mt-2 space-y-1.5">
                {validation.warnings.map((w, i) => (
                  <li key={i} className="text-amber-400/80 text-xs leading-relaxed">{w}</li>
                ))}
              </ul>
            </div>
            <button onClick={() => setValidation(null)} className="text-zinc-500 dark:hover:text-zinc-300 hover:text-zinc-700 shrink-0">
              <XCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      );
    }

    // All good
    return (
      <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm">
        <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
        <p className="text-emerald-400">Configuration is valid</p>
        <button onClick={() => setValidation(null)} className="ml-auto text-zinc-500 dark:hover:text-zinc-300 hover:text-zinc-700 shrink-0">
          <XCircle className="w-3.5 h-3.5" />
        </button>
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
          <h1 className="text-2xl font-bold dark:text-zinc-100 text-zinc-900">Configuration</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage Hermes settings and API keys</p>
        </div>
        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
          {saveMessage && (
            <Badge variant={saveMessage.includes('Error') || saveMessage.includes('Cannot') ? 'error' : 'success'}>{saveMessage}</Badge>
          )}
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="px-4 py-2 rounded-xl text-sm font-medium dark:text-zinc-400 text-zinc-800 dark:hover:text-zinc-200 hover:text-zinc-600 dark:hover:bg-zinc-800/50 hover:bg-zinc-200/50 border dark:border-zinc-800/50 border-zinc-200/50 transition-colors"
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
          <div className="flex items-center gap-3 flex-wrap mb-3">
            <span className="text-xs text-zinc-500">
              Auto-validates 2s after last edit
            </span>
            {hasUnsavedChanges && (
              <Badge variant="warning">Unsaved changes</Badge>
            )}
            {validating && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Loader2 className="w-3 h-3 animate-spin" />
                Validating...
              </div>
            )}
            {!validating && warningCount > 0 && (
              <Badge variant={validation?.errors && validation.errors.length > 0 ? 'error' : 'warning'}>
                {warningCount} {validation?.errors && validation.errors.length > 0 ? 'error' : 'warning'}{warningCount > 1 ? 's' : ''}
              </Badge>
            )}
            {!validating && validation && validation.valid && !warningCount && (
              <Badge variant="success">Valid</Badge>
            )}
          </div>
          <textarea
            value={rawConfig}
            onChange={(e) => handleRawChange(e.target.value)}
            className={`w-full h-[60vh] dark:bg-zinc-900/80 bg-zinc-50/80 dark:text-zinc-300 text-zinc-700 font-mono text-sm p-4 rounded-xl border resize-none focus:border-indigo-500/50 transition-colors ${
              validation?.errors && validation.errors.length > 0
                ? 'border-red-500/50 focus:border-red-500/50'
                : validation?.valid && warningCount === 0
                  ? 'border-emerald-500/30 focus:border-emerald-500/50'
                  : validation?.warnings && validation.warnings.length > 0
                    ? 'border-amber-500/30 focus:border-amber-500/50'
                    : 'dark:border-zinc-800/50 border-zinc-200/50'
            }`}
            spellCheck={false}
          />
          {renderValidationResult()}
          <div className="flex flex-col-reverse md:flex-row justify-end mt-4 gap-3">
            <button
              onClick={() => validateConfig(rawConfig)}
              disabled={validating}
              className="px-5 py-2.5 rounded-xl text-sm font-medium dark:text-zinc-400 text-zinc-500 hover:text-white dark:hover:bg-zinc-700/50 hover:bg-zinc-200 border dark:border-zinc-700/50 border-zinc-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {validating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {validating ? 'Validating...' : 'Validate'}
              {!validating && warningCount > 0 && (
                <span className="bg-amber-500/20 text-amber-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {warningCount}
                </span>
              )}
            </button>
            <button
              onClick={() => saveConfig(rawConfig)}
              disabled={saving || !!validation && !validation.valid}
              className={`px-5 py-2.5 rounded-xl text-white font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
                validation && !validation.valid
                  ? 'bg-red-500/50 cursor-not-allowed'
                  : hasUnsavedChanges
                    ? 'bg-gradient-to-r from-indigo-500 to-violet-500 hover:opacity-90 animate-pulse'
                    : 'bg-gradient-to-r from-indigo-500 to-violet-500 hover:opacity-90'
              }`}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Config'}
            </button>
          </div>
        </div>
      ) : (
        <>
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
                      : 'dark:text-zinc-400 text-zinc-800 dark:hover:text-zinc-200 hover:text-zinc-600 dark:hover:bg-zinc-800/50 hover:bg-zinc-200/50 border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

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

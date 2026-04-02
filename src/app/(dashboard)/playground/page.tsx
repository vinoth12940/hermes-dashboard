"use client";

import { useState, useEffect, useCallback } from 'react';
import Badge from '@/components/Badge';
import { Send, Loader2, CheckCircle, XCircle, Eye, EyeOff, Zap, Key, Globe, RefreshCw } from 'lucide-react';

interface Provider {
  name: string;
  models: string[];
  base_url: string;
  api_key_masked: string;
  is_main: boolean;
  role?: string;
}

interface TestResult {
  id: number;
  provider: string;
  model: string;
  success: boolean;
  response: string;
  latency_ms: number;
  error?: string;
}

export default function PlaygroundPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [model, setModel] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [message, setMessage] = useState('Hello, respond in one sentence.');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [history, setHistory] = useState<TestResult[]>([]);
  const [resultId, setResultId] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/playground');
      if (res.ok) {
        const data = await res.json();
        const provs = data.providers || [];
        setProviders(provs);
        if (provs.length > 0) {
          const main = provs.find((p: Provider) => p.is_main) || provs[0];
          setSelectedProvider(main.name);
          setModel(main.models[0] || '');
          setBaseUrl(main.base_url);
        } else {
          setError('No providers found in config. Add a model and provider to your Hermes config.yaml');
        }
      } else {
        setError('Failed to load providers');
      }
    } catch {
      setError('Failed to connect to server');
    }
    setLoading(false);
  };

  const handleProviderChange = useCallback((name: string) => {
    setSelectedProvider(name);
    const provider = providers.find(p => p.name === name);
    if (provider) {
      setModel(provider.models[0] || '');
      setBaseUrl(provider.base_url);
    }
  }, [providers]);

  const handleSend = async () => {
    if (!selectedProvider || !model || !message) return;
    setSending(true);
    setResult(null);
    setError('');

    try {
      const res = await fetch('/api/playground', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          model,
          base_url: baseUrl,
          api_key: apiKey,
          message,
        }),
      });
      const data = await res.json();
      const newResult: TestResult = {
        id: resultId + 1,
        provider: selectedProvider,
        model,
        success: data.success,
        response: data.response || '',
        latency_ms: data.latency_ms,
        error: data.error,
      };
      setResult(newResult);
      setResultId(newResult.id);
      setHistory(prev => [newResult, ...prev.slice(0, 9)]);
    } catch {
      const newResult: TestResult = {
        id: resultId + 1,
        provider: selectedProvider,
        model,
        success: false,
        response: '',
        latency_ms: 0,
        error: 'Failed to connect to server',
      };
      setResult(newResult);
      setResultId(newResult.id);
      setHistory(prev => [newResult, ...prev.slice(0, 9)]);
    }

    setSending(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-zinc-500">Loading providers...</p></div>;
  }

  const currentProvider = providers.find(p => p.name === selectedProvider);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Zap className="w-7 h-7 text-indigo-400" />
          <div>
            <h1 className="text-2xl font-bold dark:text-zinc-100 text-zinc-900">Model Playground</h1>
            <p className="text-sm text-zinc-500 mt-1">Test AI provider and model configurations</p>
          </div>
        </div>
        <button
          onClick={fetchProviders}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm dark:text-zinc-500 text-zinc-600 dark:hover:text-zinc-200 hover:text-zinc-800 hover:text-zinc-800 dark:hover:bg-zinc-800/50 hover:bg-zinc-200/50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {error && providers.length === 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-semibold dark:text-zinc-200 text-zinc-800">Configuration</h2>

          {/* Provider selector */}
          <div className="space-y-1">
            <label className="text-xs font-medium dark:text-zinc-500 text-zinc-600 uppercase tracking-wider">Provider</label>
            <select
              value={selectedProvider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="w-full rounded-xl dark:bg-zinc-900/80 bg-zinc-50/80 border dark:border-zinc-800/50 border-zinc-200/50 dark:text-zinc-300 text-zinc-700 text-sm p-2.5 focus:border-indigo-500/50 transition-colors appearance-none cursor-pointer"
            >
              <option value="">Select provider...</option>
              {providers.map(p => (
                <option key={p.name} value={p.name}>
                  {p.name}{p.is_main ? ' (main)' : ''}{p.role ? ` — ${p.role}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Provider info cards */}
          {currentProvider && (
            <div className="grid grid-cols-2 gap-2">
              {currentProvider.api_key_masked && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg dark:bg-zinc-800/30 bg-zinc-100/50">
                  <Key className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-xs text-zinc-500 font-mono">{currentProvider.api_key_masked}</span>
                </div>
              )}
              {currentProvider.base_url && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg dark:bg-zinc-800/30 bg-zinc-100/50">
                  <Globe className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-xs text-zinc-500 font-mono truncate">{currentProvider.base_url.replace(/^https?:\/\//, '')}</span>
                </div>
              )}
            </div>
          )}

          {/* Model */}
          <div className="space-y-1">
            <label className="text-xs font-medium dark:text-zinc-500 text-zinc-600 uppercase tracking-wider">
              Model
              {currentProvider && currentProvider.models.length > 1 && (
                <span className="ml-2 text-zinc-600 normal-case">({currentProvider.models.length} available)</span>
              )}
            </label>
            {currentProvider && currentProvider.models.length > 1 ? (
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full rounded-xl dark:bg-zinc-900/80 bg-zinc-50/80 border dark:border-zinc-800/50 border-zinc-200/50 dark:text-zinc-300 text-zinc-700 text-sm p-2.5 focus:border-indigo-500/50 transition-colors appearance-none cursor-pointer"
              >
                {currentProvider.models.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. gpt-4o, claude-sonnet-4-20250514"
                className="w-full rounded-xl dark:bg-zinc-900/80 bg-zinc-50/80 border dark:border-zinc-800/50 border-zinc-200/50 dark:text-zinc-300 text-zinc-700 text-sm p-2.5 placeholder-zinc-600 focus:border-indigo-500/50 transition-colors"
              />
            )}
          </div>

          {/* Base URL */}
          <div className="space-y-1">
            <label className="text-xs font-medium dark:text-zinc-500 text-zinc-600 uppercase tracking-wider">Base URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.openai.com"
              className="w-full rounded-xl dark:bg-zinc-900/80 bg-zinc-50/80 border dark:border-zinc-800/50 border-zinc-200/50 dark:text-zinc-300 text-zinc-700 text-sm p-2.5 placeholder-zinc-600 focus:border-indigo-500/50 transition-colors"
            />
          </div>

          {/* API Key */}
          <div className="space-y-1">
            <label className="text-xs font-medium dark:text-zinc-500 text-zinc-600 uppercase tracking-wider">
              API Key
              {currentProvider?.api_key_masked && (
                <span className="ml-2 text-emerald-500/70 normal-case">(detected from .env)</span>
              )}
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={currentProvider?.api_key_masked ? 'Using key from .env (leave blank)' : 'sk-...'}
                className="w-full rounded-xl dark:bg-zinc-900/80 bg-zinc-50/80 border dark:border-zinc-800/50 border-zinc-200/50 dark:text-zinc-300 text-zinc-700 text-sm p-2.5 pr-10 placeholder-zinc-600 focus:border-indigo-500/50 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 dark:text-zinc-500 text-zinc-600 dark:hover:text-zinc-300 hover:text-zinc-700 hover:text-zinc-600 transition-colors"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Message */}
          <div className="space-y-1">
            <label className="text-xs font-medium dark:text-zinc-500 text-zinc-600 uppercase tracking-wider">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full rounded-xl dark:bg-zinc-900/80 bg-zinc-50/80 border dark:border-zinc-800/50 border-zinc-200/50 dark:text-zinc-300 text-zinc-700 text-sm p-2.5 placeholder-zinc-600 focus:border-indigo-500/50 transition-colors resize-none"
              placeholder="Enter a test message..."
            />
          </div>

          <button
            onClick={handleSend}
            disabled={sending || !selectedProvider || !model || !message}
            className="w-full px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-medium text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Test
              </>
            )}
          </button>
        </div>

        {/* Results */}
        <div className="space-y-6">
          {result && (
            <div className="glass-card p-6 space-y-4 animate-fade-in">
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                <span className={`text-sm font-semibold ${result.success ? 'text-emerald-400' : 'text-red-400'}`}>
                  {result.success ? 'Success' : 'Failed'}
                </span>
                <Badge variant={result.success ? 'success' : 'error'}>
                  {result.latency_ms >= 1000
                    ? `${(result.latency_ms / 1000).toFixed(1)}s`
                    : `${result.latency_ms}ms`}
                </Badge>
              </div>

              {result.success ? (
                <div className="p-3 rounded-xl dark:bg-zinc-900/50 bg-zinc-50 border dark:border-zinc-800/50 border-zinc-200/50">
                  <p className="text-sm dark:text-zinc-300 text-zinc-700 whitespace-pre-wrap">{result.response}</p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                  <p className="text-sm text-red-400">{result.error}</p>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span>{result.provider}</span>
                <span className="text-zinc-700">/</span>
                <span className="font-mono text-zinc-500">{result.model}</span>
              </div>
            </div>
          )}

          {!result && (
            <div className="glass-card p-12 text-center">
              <Zap className="w-12 h-12 dark:text-zinc-700 dark:text-zinc-400 text-zinc-500 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm">Send a test message to see results</p>
              <p className="text-zinc-600 text-xs mt-1">
                {providers.length} provider{providers.length !== 1 ? 's' : ''} detected from config
              </p>
            </div>
          )}

          {history.length > 0 && (
            <div className="glass-card p-6 space-y-3">
              <h2 className="text-lg font-semibold dark:text-zinc-200 text-zinc-800">Test History</h2>
              <div className="space-y-2">
                {history.map(h => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between p-3 rounded-xl dark:bg-zinc-900/50 bg-zinc-50 border dark:border-zinc-800/50 border-zinc-200/50"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {h.success ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                      )}
                      <span className="text-sm dark:text-zinc-300 text-zinc-700 truncate">{h.provider}/{h.model}</span>
                    </div>
                    <Badge variant={h.success ? 'success' : 'error'}>
                      {h.latency_ms >= 1000
                        ? `${(h.latency_ms / 1000).toFixed(1)}s`
                        : `${h.latency_ms}ms`}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

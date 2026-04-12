"use client";

import { useState, useEffect } from 'react';
import Badge from '@/components/Badge';
import { Bell, BellOff, Plus, Trash2, Play, CheckCircle, AlertTriangle, X } from 'lucide-react';

interface AlertRule {
  id: string;
  type: 'cpu' | 'memory' | 'gateway';
  condition: { threshold: number; operator: 'gt' | 'lt' };
  enabled: boolean;
  notifyTo: string;
  lastTriggered?: string;
}

interface AlertEvent {
  alertId: string;
  type: string;
  value: number;
  threshold: number;
  operator: string;
  triggeredAt: string;
  notifyTo: string;
}

const typeColors: Record<string, string> = {
  cpu: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  memory: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  gateway: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
};

const typeLabels: Record<string, string> = {
  cpu: 'CPU Usage',
  memory: 'Memory Usage',
  gateway: 'Gateway Status',
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: 'cpu' as 'cpu' | 'memory' | 'gateway',
    threshold: 80,
    operator: 'gt' as 'gt' | 'lt',
    notifyTo: 'telegram',
  });
  const [message, setMessage] = useState('');

  const fetchData = async () => {
    try {
      const res = await fetch('/api/alerts');
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
        setEvents(data.events || []);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const createAlert = async () => {
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', alert: form }),
      });
      if (res.ok) {
        setMessage('Alert created');
        setShowForm(false);
        await fetchData();
      } else {
        const data = await res.json();
        setMessage(`Error: ${data.error}`);
      }
    } catch {
      setMessage('Failed to create alert');
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const toggleAlert = async (alert: AlertRule) => {
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', alert: { id: alert.id, enabled: !alert.enabled } }),
      });
      if (res.ok) await fetchData();
    } catch (e) { console.error(e); }
  };

  const deleteAlert = async (id: string) => {
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', alert: { id } }),
      });
      if (res.ok) await fetchData();
    } catch (e) { console.error(e); }
  };

  const testAlerts = async () => {
    setTesting(true);
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test' }),
      });
      if (res.ok) {
        const data = await res.json();
        const triggered = data.results?.filter((r: any) => r.triggered).length || 0;
        setMessage(`Test complete: ${triggered} alert(s) triggered`);
        await fetchData();
      }
    } catch {
      setMessage('Test failed');
    }
    setTesting(false);
    setTimeout(() => setMessage(''), 5000);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-zinc-500">Loading alerts...</p></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-zinc-100 text-zinc-900">Alert Rules</h1>
          <p className="text-sm text-zinc-500 mt-1">Configure system monitoring alerts</p>
        </div>
        <div className="flex items-center gap-3">
          {message && (
            <Badge variant={message.includes('Error') || message.includes('Failed') ? 'error' : 'success'}>{message}</Badge>
          )}
          <button
            onClick={testAlerts}
            disabled={testing || alerts.filter(a => a.enabled).length === 0}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/20 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            {testing ? 'Testing...' : 'Test Alerts'}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-medium text-sm hover:opacity-90 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Alert
          </button>
        </div>
      </div>

      {showForm && (
        <div className="glass-card p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold dark:text-zinc-100 text-zinc-900">Create Alert Rule</h2>
            <button onClick={() => setShowForm(false)} className="dark:text-zinc-600 text-zinc-500 dark:hover:text-zinc-300 hover:text-zinc-700 hover:text-zinc-700">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                className="w-full px-3 py-2.5 rounded-xl dark:bg-zinc-900/80 bg-zinc-50/80 border dark:border-zinc-800/50 border-zinc-200/50 dark:text-zinc-600 text-zinc-500 text-sm focus:border-indigo-500/50"
              >
                <option value="cpu">CPU Usage (%)</option>
                <option value="memory">Memory Usage (%)</option>
                <option value="gateway">Gateway Status</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Operator</label>
              <select
                value={form.operator}
                onChange={(e) => setForm({ ...form, operator: e.target.value as any })}
                className="w-full px-3 py-2.5 rounded-xl dark:bg-zinc-900/80 bg-zinc-50/80 border dark:border-zinc-800/50 border-zinc-200/50 dark:text-zinc-600 text-zinc-500 text-sm focus:border-indigo-500/50"
              >
                <option value="gt">{'>'} Greater than</option>
                <option value="lt">{'<'} Less than</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">
                Threshold {form.type !== 'gateway' ? '(%)' : '(0=down, 1=up)'}
              </label>
              <input
                type="number"
                value={form.threshold}
                onChange={(e) => setForm({ ...form, threshold: Number(e.target.value) })}
                className="w-full px-3 py-2.5 rounded-xl dark:bg-zinc-900/80 bg-zinc-50/80 border dark:border-zinc-800/50 border-zinc-200/50 dark:text-zinc-600 text-zinc-500 text-sm focus:border-indigo-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Notify To</label>
              <input
                type="text"
                value={form.notifyTo}
                onChange={(e) => setForm({ ...form, notifyTo: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl dark:bg-zinc-900/80 bg-zinc-50/80 border dark:border-zinc-800/50 border-zinc-200/50 dark:text-zinc-600 text-zinc-500 text-sm focus:border-indigo-500/50"
                placeholder="telegram"
              />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={createAlert}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-medium text-sm hover:opacity-90 transition-all"
            >
              Create Alert
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-semibold dark:text-zinc-100 text-zinc-900">Active Rules</h2>
        {alerts.length === 0 ? (
          <div className="glass-card p-8 text-center text-zinc-500">
            <Bell className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No alert rules configured. Create one to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div key={alert.id} className="glass-card p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <button
                    onClick={() => toggleAlert(alert)}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                      alert.enabled
                        ? 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white'
                        : 'dark:bg-zinc-800 bg-zinc-200 dark:text-zinc-600 text-zinc-500'
                    }`}
                  >
                    {alert.enabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${typeColors[alert.type]}`}>
                        {typeLabels[alert.type]}
                      </span>
                      <span className="text-sm dark:text-zinc-600 text-zinc-500 font-medium">
                        {alert.condition.operator === 'gt' ? '>' : '<'} {alert.condition.threshold}
                        {alert.type !== 'gateway' ? '%' : ''}
                      </span>
                      <Badge variant={alert.enabled ? 'success' : 'default'}>
                        {alert.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-zinc-500">Notify: {alert.notifyTo}</span>
                      {alert.lastTriggered && (
                        <span className="text-xs dark:text-zinc-600 text-zinc-500">
                          Last: {new Date(alert.lastTriggered).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => deleteAlert(alert.id)}
                  className="p-2.5 rounded-xl dark:text-zinc-600 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold dark:text-zinc-100 text-zinc-900">Alert History</h2>
        {events.length === 0 ? (
          <div className="glass-card p-8 text-center text-zinc-500">
            <CheckCircle className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No alerts triggered yet.</p>
          </div>
        ) : (
          <div className="glass-card p-4 space-y-2 max-h-96 overflow-y-auto">
            {events.map((event, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl dark:bg-zinc-900/50 bg-zinc-50 border dark:border-zinc-800/30 border-zinc-100">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm dark:text-zinc-600 text-zinc-500">
                    <span className="font-medium">{typeLabels[event.type] || event.type}</span>
                    {' '}{event.operator === 'gt' ? '>' : '<'}{' '}
                    {event.threshold}{event.type !== 'gateway' ? '%' : ''}
                    {' '}(current: {event.value}{event.type !== 'gateway' ? '%' : ''})
                  </p>
                  <p className="text-xs text-zinc-500">{new Date(event.triggeredAt).toLocaleString()} · {event.notifyTo}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

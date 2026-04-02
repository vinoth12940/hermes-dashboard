"use client";

import './login.css';
import { useState } from 'react';
import { Zap, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (res.ok) {
        window.location.href = '/';
      } else {
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center dark:bg-zinc-950 bg-gradient-to-br from-zinc-50 to-zinc-100 relative overflow-hidden login-page">
      {/* Background gradients */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 dark:bg-indigo-500/10 bg-indigo-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 dark:bg-violet-500/10 bg-violet-500/5 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] dark:bg-indigo-500/5 bg-indigo-500/3 rounded-full blur-3xl" />

      <div className="p-8 w-full max-w-sm animate-fade-in relative z-10 dark:bg-zinc-900 bg-white rounded-2xl dark:border-zinc-800 border-zinc-200 shadow-2xl shadow-black/5 dark:shadow-black/50">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center mb-4">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold dark:text-white text-zinc-900">Hermes Dashboard</h1>
          <p className="text-sm dark:text-zinc-400 text-zinc-500 mt-1">Admin Access</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <label className="text-sm font-medium dark:text-zinc-300 text-zinc-700 block mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl dark:bg-zinc-800 bg-zinc-50 dark:border-zinc-700 border-zinc-200 dark:text-white text-zinc-900 dark:placeholder-zinc-500 placeholder-zinc-400 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 outline-none transition-colors"
              placeholder="Enter username"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm font-medium dark:text-zinc-300 text-zinc-700 block mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl dark:bg-zinc-800 bg-zinc-50 dark:border-zinc-700 border-zinc-200 dark:text-white text-zinc-900 dark:placeholder-zinc-500 placeholder-zinc-400 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 outline-none transition-colors pr-12"
                placeholder="Enter password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 dark:text-zinc-500 text-zinc-400 dark:hover:text-zinc-300 hover:text-zinc-700 hover:text-zinc-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-medium text-sm hover:opacity-90 transition-all disabled:opacity-50 mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing in...
              </span>
            ) : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

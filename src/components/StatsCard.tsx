"use client";

import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}

export default function StatsCard({ title, value, subtitle, icon: Icon, trend, color = 'from-indigo-500 to-violet-500' }: StatsCardProps) {
  return (
    <div className="glass-card p-5 animate-fade-in hover:border-indigo-500/20 transition-all duration-300 group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-zinc-500 font-medium">{title}</p>
          <p className="text-2xl font-bold mt-1 dark:text-zinc-100 text-zinc-900">{value}</p>
          {subtitle && (
            <p className={`text-xs mt-1 ${
              trend === 'up' ? 'text-emerald-400' : 
              trend === 'down' ? 'text-red-400' : 'text-zinc-500'
            }`}>
              {subtitle}
            </p>
          )}
        </div>
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}

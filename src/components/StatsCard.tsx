"use client";

import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
  gradientBorder?: boolean;
}

const colorBorderMap: Record<string, string> = {
  'from-blue-500 to-cyan-500': 'border-l-blue-500',
  'from-violet-500 to-purple-500': 'border-l-violet-500',
  'from-amber-500 to-orange-500': 'border-l-amber-500',
  'from-emerald-500 to-teal-500': 'border-l-emerald-500',
  'from-indigo-500 to-violet-500': 'border-l-indigo-500',
};

const colorHoverMap: Record<string, string> = {
  'from-blue-500 to-cyan-500': 'hover:from-blue-500/5 hover:to-cyan-500/5',
  'from-violet-500 to-purple-500': 'hover:from-violet-500/5 hover:to-purple-500/5',
  'from-amber-500 to-orange-500': 'hover:from-amber-500/5 hover:to-orange-500/5',
  'from-emerald-500 to-teal-500': 'hover:from-emerald-500/5 hover:to-teal-500/5',
  'from-indigo-500 to-violet-500': 'hover:from-indigo-500/5 hover:to-violet-500/5',
};

export default function StatsCard({ title, value, subtitle, icon: Icon, trend, color = 'from-indigo-500 to-violet-500', gradientBorder = false }: StatsCardProps) {
  const borderColor = colorBorderMap[color] || 'border-l-indigo-500';
  const hoverClass = colorHoverMap[color] || '';

  return (
    <div className={`glass-card p-5 animate-fade-in transition-all duration-300 group hover:border-indigo-500/20 border-l-[3px] ${borderColor} ${hoverClass} ${gradientBorder ? 'gradient-border' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">{title}</p>
          <p className="text-4xl font-bold mt-1 dark:text-white text-zinc-900 leading-tight">{value}</p>
          {subtitle && (
            <p className={`text-xs mt-1.5 ${
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

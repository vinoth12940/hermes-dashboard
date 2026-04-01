"use client";

import { X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ 
  open, title, message, confirmText = 'Confirm', cancelText = 'Cancel',
  variant = 'primary', onConfirm, onCancel 
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="glass-card p-6 max-w-md w-full animate-fade-in gradient-border relative z-10 bg-zinc-950">
        <button onClick={onCancel} className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300">
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-semibold text-zinc-100">{title}</h3>
        <p className="mt-2 text-sm text-zinc-400">{message}</p>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-sm font-medium text-white transition-all ${
              variant === 'danger'
                ? 'bg-red-500/80 hover:bg-red-500'
                : 'bg-gradient-to-r from-indigo-500 to-violet-500 hover:opacity-90'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

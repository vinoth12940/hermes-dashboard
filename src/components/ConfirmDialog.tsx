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
      <div className="p-6 max-w-md w-full animate-fade-in relative z-10 rounded-2xl border dark:border-zinc-700/50 border-zinc-200 dark:bg-zinc-900 bg-white shadow-2xl shadow-black/50 dark:shadow-black/70">
        <button onClick={onCancel} className="absolute top-4 right-4 dark:text-zinc-500 text-zinc-400 dark:hover:text-zinc-300 hover:text-zinc-700 hover:text-zinc-600 transition-colors">
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-semibold dark:text-zinc-100 text-zinc-900">{title}</h3>
        <p className="mt-2 text-sm dark:text-zinc-400 text-zinc-600">{message}</p>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-medium dark:text-zinc-400 text-zinc-600 dark:hover:text-zinc-200 hover:text-zinc-800 hover:text-zinc-800 dark:hover:bg-zinc-800/50 hover:bg-zinc-200/50 transition-colors"
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

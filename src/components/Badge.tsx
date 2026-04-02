interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default';
  size?: 'sm' | 'md';
}

const variants = {
  success: 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20',
  error: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20',
  info: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20',
  default: 'bg-zinc-500/15 text-zinc-500 dark:text-zinc-400 border-zinc-500/20',
};

export default function Badge({ children, variant = 'default', size = 'sm' }: BadgeProps) {
  return (
    <span className={`
      inline-flex items-center rounded-full border font-medium
      ${variants[variant]}
      ${size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'}
    `}>
      {children}
    </span>
  );
}

type Props = {
  value?: string | null;
};

export function StatusChip({ value }: Props) {
  const label = (value || 'Unknown').replace(/_/g, ' ');
  const key = label.toLowerCase();

  let cls = 'bg-zinc-700/40 text-zinc-200 border-zinc-600';
  if (key.includes('new') || key.includes('todo') || key.includes('draft')) cls = 'bg-blue-500/15 text-blue-300 border-blue-500/40';
  else if (key.includes('progress') || key.includes('in review') || key.includes('open')) cls = 'bg-amber-500/15 text-amber-300 border-amber-500/40';
  else if (key.includes('complete') || key.includes('done') || key.includes('won')) cls = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';
  else if (key.includes('lost') || key.includes('cancel') || key.includes('blocked')) cls = 'bg-red-500/15 text-red-300 border-red-500/40';

  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

type Props = {
  value?: string | null;
};

export function StatusChip({ value }: Props) {
  const label = (value || 'Unknown').replace(/_/g, ' ');
  const key = label.toLowerCase();

  let cls = 'border-slate-300 bg-slate-100 text-slate-700';
  if (key.includes('new') || key.includes('todo') || key.includes('draft')) cls = 'border-sky-200 bg-sky-100 text-sky-700';
  else if (key.includes('progress') || key.includes('in review') || key.includes('open')) cls = 'border-amber-200 bg-amber-100 text-amber-700';
  else if (key.includes('complete') || key.includes('done') || key.includes('won')) cls = 'border-emerald-200 bg-emerald-100 text-emerald-700';
  else if (key.includes('lost') || key.includes('cancel') || key.includes('blocked')) cls = 'border-rose-200 bg-rose-100 text-rose-700';

  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

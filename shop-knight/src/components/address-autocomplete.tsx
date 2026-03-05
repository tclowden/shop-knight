"use client";

import { useEffect, useId, useState } from 'react';

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function AddressAutocomplete({ label, value, onChange, placeholder, className }: Props) {
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const listId = useId();

  useEffect(() => {
    const q = value.trim();
    if (q.length < 3) {
      setOptions([]);
      return;
    }

    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/address-search?q=${encodeURIComponent(q)}`);
        if (!res.ok) {
          setOptions([]);
          return;
        }
        setOptions(await res.json());
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => clearTimeout(t);
  }, [value]);

  return (
    <label className="text-sm">
      <span className="mb-1 block text-zinc-300">{label}</span>
      <input
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Start typing address...'}
        className={className || 'w-full rounded border border-zinc-700 bg-white p-2 text-zinc-900'}
      />
      <datalist id={listId}>
        {options.map((opt) => (
          <option key={opt} value={opt} />
        ))}
      </datalist>
      {loading ? <span className="mt-1 block text-xs text-zinc-500">Looking up addresses…</span> : null}
    </label>
  );
}

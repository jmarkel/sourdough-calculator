type FieldProps = {
  label: string;
  suffix: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
};

export function Field({ label, suffix, value, onChange, hint }: FieldProps) {
  return (
    <label className="grid gap-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-slate-800">{label}</span>
        <span className="text-xs text-slate-500">{suffix}</span>
      </div>

      <input
        inputMode="decimal"
        dir="ltr"
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
        value={value}
        onChange={(e) => onChange((e.target as HTMLInputElement).value)}
        placeholder={hint}
      />

      {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

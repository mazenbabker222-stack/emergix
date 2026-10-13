/** Marks sample data (dates, fees, prices) that the owner has not confirmed yet. */
export function PlaceholderBadge({ label = 'Placeholder' }: { label?: string }) {
  return <span className="badge-placeholder" title="Sample value: confirm on the official site before relying on it">{label}</span>;
}

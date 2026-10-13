import { GLOBAL_RATINGS, maxTotal, sumMarks } from '@workspace/osce-core';
import type { OsceMarkingDomain } from '@workspace/api-client-react';
import type { MarkingState } from '../lib/useMarking';

/** Examiner marking sheet: domain scoring, live total, global rating, notes. Fully controlled. */
export function MarkingSheet({
  domains,
  state,
  onChange,
  onClear,
  onSave,
  saveLabel = 'Save attempt',
  status,
  disabled = false,
}: {
  domains: OsceMarkingDomain[];
  state: MarkingState;
  onChange: (next: MarkingState) => void;
  onClear?: () => void;
  onSave?: () => void;
  saveLabel?: string;
  status?: string;
  disabled?: boolean;
}) {
  const ids = domains.map((d) => ({ id: d.id, maxMarks: d.maxMarks }));
  const total = sumMarks(ids, state.marks);
  const max = maxTotal(ids);
  return (
    <div className="osce-marking">
      <div className="osce-scroll" tabIndex={0} role="region" aria-label="Marking table, scrolls sideways on small screens">
        <table className="osce-table">
          <thead><tr><th scope="col">Domain</th><th scope="col">Mark</th></tr></thead>
          <tbody>
            {domains.map((d) => (
              <tr key={d.id}>
                <th scope="row">
                  {d.domain} <span className="osce-muted">(max {d.maxMarks})</span>
                  {d.descriptor && <div className="osce-descriptor">{d.descriptor}</div>}
                </th>
                <td>
                  <select
                    aria-label={`Mark for ${d.domain}, maximum ${d.maxMarks}`}
                    value={state.marks[d.id] ?? 0}
                    disabled={disabled}
                    onChange={(e) => onChange({ ...state, marks: { ...state.marks, [d.id]: Number(e.target.value) } })}
                  >
                    {Array.from({ length: d.maxMarks + 1 }, (_, k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="osce-total" aria-live="polite">Total: <span data-testid="osce-total">{total}</span> / {max}</p>
      <div className="osce-field">
        <label htmlFor="osce-global-rating">Global rating</label>
        <select
          id="osce-global-rating"
          value={state.globalRating ?? ''}
          disabled={disabled}
          onChange={(e) => onChange({ ...state, globalRating: e.target.value === '' ? null : (e.target.value as (typeof GLOBAL_RATINGS)[number]) })}
        >
          <option value="">Not rated</option>
          {GLOBAL_RATINGS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div className="osce-field">
        <label htmlFor="osce-notes">Notes (optional)</label>
        <textarea id="osce-notes" rows={3} maxLength={4000} value={state.notes} disabled={disabled} onChange={(e) => onChange({ ...state, notes: e.target.value })} />
      </div>
      <div className="osce-actions">
        {onSave && <button type="button" className="btn btn-primary" onClick={onSave} disabled={disabled}>{saveLabel}</button>}
        {onClear && <button type="button" className="btn btn-ghost" onClick={onClear} disabled={disabled}>Clear marks</button>}
        {status && <span className="osce-muted" role="status">{status}</span>}
      </div>
    </div>
  );
}

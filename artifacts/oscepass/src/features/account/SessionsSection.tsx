import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';
import { FormAlert } from '@/features/auth/components/FormAlert';
import { authClient } from '@/lib/auth-client';
import { describeUserAgent } from './userAgent';

interface SessionRow {
  id: string;
  token: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt: Date | string;
}

export function SessionsSection() {
  const { sessionToken } = useAuth();
  const [rows, setRows] = useState<SessionRow[] | null>(null);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await authClient.listSessions();
    if (error) return setMessage('We could not load your devices.');
    setRows((data as SessionRow[]).slice().sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)));
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function revoke(token: string) {
    setMessage('');
    const { error } = await authClient.revokeSession({ token });
    if (error) return setMessage('We could not sign that device out.');
    await load();
  }
  async function revokeOthers() {
    setMessage('');
    const { error } = await authClient.revokeOtherSessions();
    if (error) return setMessage('We could not sign your other devices out.');
    await load();
  }

  const others = rows?.filter((r) => r.token !== sessionToken).length ?? 0;
  return (
    <section className="account-section" aria-labelledby="sessions-h">
      <h2 id="sessions-h">Signed-in devices</h2>
      <p className="field-hint">You can be signed in on a limited number of devices at once.</p>
      <FormAlert message={message} />
      {!rows ? <p role="status">Loading…</p> : (
        <ul className="session-list">
          {rows.map((r) => (
            <li key={r.id} className="session-row">
              <div>
                <strong>{describeUserAgent(r.userAgent)}</strong>{r.token === sessionToken && <span className="badge">This device</span>}
                <div className="field-hint">{r.ipAddress ? `${r.ipAddress} · ` : ''}signed in {new Date(r.createdAt).toLocaleString()}</div>
              </div>
              {r.token !== sessionToken && <button type="button" className="btn btn-ghost btn-sm" onClick={() => revoke(r.token)}>Sign out</button>}
            </li>
          ))}
        </ul>
      )}
      {others > 0 && <button type="button" className="btn btn-ghost" onClick={revokeOthers}>Sign out all other devices</button>}
    </section>
  );
}

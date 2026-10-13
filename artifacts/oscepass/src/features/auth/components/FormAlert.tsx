import { useEffect, useRef } from 'react';

/** Form-level message. Moves focus to itself when it appears so keyboard and screen-reader users notice it. */
export function FormAlert({ message, tone = 'error' }: { message: string; tone?: 'error' | 'success' }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (message) ref.current?.focus();
  }, [message]);
  if (!message) return null;
  return (
    <div ref={ref} tabIndex={-1} className={tone === 'error' ? 'form-alert' : 'notice'} role={tone === 'error' ? 'alert' : 'status'}>
      {message}
    </div>
  );
}

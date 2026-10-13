import { useEffect, useRef, useState } from 'react';
import { Play, X } from 'lucide-react';
import { brand } from '@/config/brand';

export function VideoModal({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [playing, setPlaying] = useState(false);
  const [frame, setFrame] = useState(0);
  const previewFrames = [
    ['Start with the case', 'Read the candidate instructions and identify the task.'],
    ['Practise with structure', 'Work through a realistic emergency medicine scenario.'],
    ['Review examiner guidance', 'Use the marking domains and model answers to reflect.'],
  ];
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key === 'Tab') {
        const focusable = Array.from(document.querySelectorAll<HTMLElement>('.video-modal button:not([disabled]), .video-modal a[href], .video-modal [tabindex]:not([tabindex="-1"])'));
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [onClose]);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setFrame((current) => (current + 1) % previewFrames.length), 2600);
    return () => window.clearInterval(timer);
  }, [playing, previewFrames.length]);
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="video-modal" role="dialog" aria-modal="true" aria-labelledby="demo-title">
      <button className="modal-close" ref={closeRef} onClick={onClose} aria-label="Close video demo"><X size={21} /></button>
      <div className="modal-video" aria-live="polite">
        <div className="demo-window">
          <div className="demo-window-top"><span className="demo-dots"><i /><i /><i /></span><span>{brand.name.toUpperCase()} · PRACTICE PREVIEW</span><span>DEMO</span></div>
          <div className="demo-window-body"><div className="demo-window-sidebar"><span className="demo-side-active">Station brief</span><span>Candidate view</span><span>Examiner feedback</span></div><div className="demo-window-content"><span className="demo-label">MRCEM OSCE · NEUROLOGY</span><h3>{previewFrames[frame][0]}</h3><p>{previewFrames[frame][1]}</p><div className="demo-placeholder-lines"><i /><i /><i /></div><div className="demo-window-footer"><span><span className="demo-dot" /> Case-based learning</span><span>08:00</span></div></div></div>
        </div>
        <div className="demo-caption"><div><h2 id="demo-title">A closer look at {brand.name}</h2><p>{previewFrames[frame][1]}</p></div><button className="btn btn-primary" onClick={() => { if (!playing) setFrame((current) => (current + 1) % previewFrames.length); setPlaying((current) => !current); }} aria-label={playing ? 'Pause platform preview' : 'Play platform preview'}>{playing ? 'Pause preview' : <><Play size={15} fill="white" /> Play preview</>}</button></div>
      </div>
    </div>
  </div>;
}

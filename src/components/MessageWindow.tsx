import { useEffect, useRef, useState } from 'react';
import type { TextEntry } from '@/engine/interpreter';

/**
 * 文字送り。クリックで全文表示 → 再クリックで次へ、は store 側が制御する。
 * ここは「速度に従って表示文字数を増やす」だけを担当する。
 */
export function MessageWindow({
  entry,
  speed,
  done,
  onDone,
  hidden,
  breakFrame,
}: {
  entry: TextEntry | null;
  speed: number;
  done: boolean;
  onDone: () => void;
  hidden: boolean;
  breakFrame: boolean;
}) {
  const [shown, setShown] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!entry) return;
    if (done || speed >= 100) {
      setShown(entry.text.length);
      return;
    }
    setShown(0);
    const total = entry.text.length;
    // speed 0 → 90ms/字、speed 99 → 6ms/字
    const per = Math.max(6, 92 - speed * 0.87) * (entry.slow ? 2.4 : 1);
    const t0 = performance.now();
    const tick = () => {
      const k = Math.floor((performance.now() - t0) / per);
      if (k >= total) {
        setShown(total);
        onDone();
        return;
      }
      setShown(k);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.key, done, speed]);

  useEffect(() => {
    if (done && entry) setShown(entry.text.length);
  }, [done, entry]);

  if (!entry) return null;

  const isSystem = entry.speaker === 'system';
  const text = entry.text.slice(0, shown);
  const complete = shown >= entry.text.length;

  const cls = [
    'msg-text',
    isSystem ? 'system' : 'narration',
    entry.whisper ? 'whisper' : '',
    entry.echoed ? 'echoed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`msg-wrap ${hidden ? 'hidden' : ''}`}>
      <div
        className="msg-window"
        style={breakFrame ? { borderColor: 'rgba(247,245,239,.55)' } : undefined}
      >
        {entry.name && <div className="speaker">{entry.name}</div>}
        {isSystem ? (
          <div className={cls} dangerouslySetInnerHTML={{ __html: text }} />
        ) : (
          <div className={cls}>
            {text}
            {complete && <span className="caret">▼</span>}
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useRef } from 'react';
import type { TextEntry } from '@/engine/interpreter';

export function Backlog({
  entries,
  onClose,
}: {
  entries: TextEntry[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo(0, ref.current.scrollHeight);
  }, []);
  return (
    <div className="screen backlog" ref={ref}>
      <button className="screen-back" onClick={onClose}>
        とじる
      </button>
      <div className="screen-inner">
        <h2>バックログ</h2>
        <div className="sub">{entries.length} 行</div>
        {entries.map((e, i) => (
          <div key={`${e.key}-${i}`} className="backlog-entry">
            {e.name && <span className="who">{e.name}</span>}
            {e.speaker === 'system' ? (
              <span dangerouslySetInnerHTML={{ __html: e.text }} />
            ) : (
              e.text
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

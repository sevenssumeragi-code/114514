import { useEffect, useState } from 'react';
import type { GameStore } from '@/systems/store';
import { endingDef } from '@/data/endings';

export function EndingScreen({ store, endingId }: { store: GameStore; endingId: string }) {
  const def = endingDef(endingId);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 2200);
    return () => clearTimeout(t);
  }, []);

  const firstTime =
    def && store.persistent.endings[endingId] !== undefined &&
    Date.now() - store.persistent.endings[endingId] < 12000;

  return (
    <div className={`ending-screen ${def?.kind ?? ''}`}>
      <div className="kind">{def?.kind ?? 'END'}</div>
      <div className="ti">{def?.title ?? endingId}</div>
      <div className="id">{endingId}</div>
      {firstTime && <div className="first">初回到達</div>}
      {ready && (
        <button
          className="ctrl-btn"
          style={{ marginTop: 26, padding: '12px 30px', minHeight: 46 }}
          onClick={() => store.finishEnding()}
        >
          タイトルへ
        </button>
      )}
    </div>
  );
}

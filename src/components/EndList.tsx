import type { GameStore } from '@/systems/store';
import { ENDINGS } from '@/data/endings';

const KIND_ORDER = { TRUE: 0, HAPPY: 1, NORMAL: 2, BAD: 3 } as const;

export function EndList({ store }: { store: GameStore }) {
  const seen = store.persistent.endings;
  const list = [...ENDINGS].sort(
    (a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.id.localeCompare(b.id),
  );
  const total = ENDINGS.length;
  const got = ENDINGS.filter((e) => seen[e.id]).length;

  return (
    <div className="screen">
      <button className="screen-back" onClick={() => store.back()}>
        もどる
      </button>
      <div className="screen-inner">
        <h2>END LIST</h2>
        <div className="sub">
          {got} ／ {total} 到達
        </div>
        <div className="end-grid">
          {list.map((e) => {
            const has = seen[e.id] !== undefined;
            return (
              <div key={e.id} className={`end-card ${has ? 'seen' : 'unseen'}`}>
                <div className="id">
                  <span className={`end-kind ${e.kind}`}>{e.kind}</span>　{e.id}
                </div>
                <div className="ti">{has ? e.title : '— — — —'}</div>
                <div className="bl">{has ? e.blurb : '未到達'}</div>
                {has && (
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 8 }}>
                    初回到達 {new Date(seen[e.id]).toLocaleDateString('ja-JP')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
